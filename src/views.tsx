import { Model } from "backbone";
import { CachedMetadata, Editor, ItemView, MarkdownView, moment, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { ObsidianBridge } from 'Obsidian-Tasks-Timeline/src/obsidianbridge';
import { ObsidianTaskAdapter } from "Obsidian-Tasks-Timeline/src/taskadapter";
import { createRoot, Root } from 'react-dom/client';
import * as TaskMapable from 'utils/taskmapable';
import { TaskDataModel, TaskStatus, TaskStatusMarkerMap, TaskRegularExpressions } from "utils/tasks";
import { defaultUserOptions, SpecificTaskFile, UserOption } from "./settings";
import { t } from "./i18n";


export const CALENDAR_VIEW = "tasks_calendar_view";
export const TIMELINE_VIEW = "tasks_timeline_view";

export abstract class BaseTasksView extends ItemView {
    protected root: Root;
    //protected dataAdapter: ObsidianTaskAdapter;
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        //this.dataAdapter = new ObsidianTaskAdapter(this.app);
    }
}

export class TasksTimelineView extends BaseTasksView {
    private taskListModel = new Model({
        taskList: [] as TaskDataModel[],
        specificTaskFileData: [] as Array<{ alias: string; tasks: TaskDataModel[] }>,
    });

    private isReloading: boolean = false;
    private userOptionModel = new Model({ ...defaultUserOptions });
    private adapter: ObsidianTaskAdapter | null = null;
    static view: TasksTimelineView | null = null;

    // 增量更新防抖：收集短时间内变化的文件，批量处理
    private pendingFiles: Set<string> = new Set();
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    // 是否已立即处理了第一批变更（避免重复立即处理）
    private immediateProcessed: boolean = false;
    // 缓存 onFileChanged 回调中 Obsidian 已提供的 data 和 cache，避免重复 I/O
    private fileCacheMap: Map<string, { data: string; cache: CachedMetadata }> = new Map();
    // 任务状态缓存：${path}:${line} → statusMarker，O(1) 用于 editor-change 快速查找
    private taskStatusMap: Map<string, string> = new Map();
    private static readonly DEBOUNCE_MS = 50;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);

        this.parseTasks = this.parseTasks.bind(this);
        this.onReloadTasks = this.onReloadTasks.bind(this);
        this.onUpdateOptions = this.onUpdateOptions.bind(this);
        this.onFileChanged = this.onFileChanged.bind(this);
        this.onFileDeleted = this.onFileDeleted.bind(this);
        this.doFullReload = this.doFullReload.bind(this);
        TasksTimelineView.view = this;
    }

    async onOpen(): Promise<void> {
        // 文件变更时进行增量更新
        this.registerEvent(this.app.metadataCache.on('changed', this.onFileChanged));
        // 文件删除时移除对应任务
        this.registerEvent(this.app.vault.on('delete', this.onFileDeleted));
        // 编辑器即时变更：直接从编辑器内存读取新状态，无需等待文件落盘
        this.registerEvent(this.app.workspace.on('editor-change', this.onEditorChange));

        const { containerEl } = this;
        const container = containerEl.children[1];

        container.empty();
        this.root = createRoot(container);
        this.root.render(
            <ObsidianBridge plugin={this} userOptionModel={this.userOptionModel} taskListModel={this.taskListModel} />
        );

        // 如果 factory 中已触发了 reload，则等待其完成；否则立即触发
        await this.onReloadTasks();
    }

    async onClose(): Promise<void> {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.taskStatusMap.clear();
    }

    onUpdateOptions(opt: UserOption) {
        this.userOptionModel.clear();
        this.userOptionModel.set({ ...opt });
        this.onReloadTasks();
    }

    async onReloadTasks() {
        await this.doFullReload();
    }

    /**
     * 增量更新：当文件内容变更后，只重新解析该文件的任务。
     * Obsidian 回调已提供 data（文件内容）和 cache（解析后的元数据），
     * 直接缓存利用，避免后续重复 I/O。
     */
    private onFileChanged = (file: TFile, data: string, cache: CachedMetadata) => {
        if (!file?.path) return;
        // 缓存 Obsidian 已提供的数据，后续 processPendingFiles 直接使用
        this.fileCacheMap.set(file.path, { data, cache });
        this.pendingFiles.add(file.path);
        this.scheduleIncrementalUpdate();
    };

    /**
     * 编辑器即时变更：当用户在笔记中点击 checkbox 切换任务状态时，
     * Tasks 插件直接修改编辑器内存中的行内容，此时编辑器已有最新状态。
     * 本处理器直接从编辑器行读取新标记并更新 model，无需等待文件落盘和 metadataCache 事件，
     * 实现零延迟的 UI 同步。
     */
    private onEditorChange = (editor: Editor, markdownView: MarkdownView) => {
        if (!markdownView?.file) return;
        const filePath = markdownView.file.path;

        // 仅在编辑器有焦点时处理（排除程序化编辑，如 handleCompleteTask 中的 toggle-done）
        if (!editor.hasFocus()) return;

        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const match = TaskRegularExpressions.taskRegex.exec(line);
        if (!match) return;

        const newMarker = match[3];
        const key = `${filePath}:${cursor.line}`;
        const oldMarker = this.taskStatusMap.get(key);
        if (oldMarker === undefined || oldMarker === newMarker) return;

        // 状态标记已变更 → 立即更新 model 中的数据
        const modelList: TaskDataModel[] = this.taskListModel.get("taskList") as TaskDataModel[];
        if (!modelList) return;

        const updatedTasks = modelList.map(task => {
            if (task.path === filePath && task.position.start.line === cursor.line) {
                return {
                    ...task,
                    statusMarker: newMarker,
                    checked: true,
                    completed: newMarker === 'x',
                    fullyCompleted: newMarker !== ' ',
                };
            }
            return task;
        });

        this.taskListModel.set({ taskList: updatedTasks });
        this.taskStatusMap.set(key, newMarker);
    };

    /**
     * 调度增量更新（带防抖）。
     * 第一个变更立即处理，后续变更在 50ms 内合并处理，保证即时响应。
     */
    private scheduleIncrementalUpdate() {
        if (!this.immediateProcessed && !this.isReloading) {
            // 首个变更立即处理，给用户即时反馈
            this.immediateProcessed = true;
            this.processPendingFiles();
            return;
        }
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => this.processPendingFiles(), TasksTimelineView.DEBOUNCE_MS);
    }

    /**
     * 实际执行增量更新：清空待处理文件队列，逐文件重新解析。
     * 若当前正在全量/增量重载中，自动延迟重试，避免丢弃变更。
     */
    private async processPendingFiles() {
        this.debounceTimer = null;

        if (this.isReloading) {
            // 正在重载中，延迟重试
            this.debounceTimer = setTimeout(() => this.processPendingFiles(), TasksTimelineView.DEBOUNCE_MS);
            return;
        }

        const files = [...this.pendingFiles];
        if (files.length === 0) return;
        this.pendingFiles.clear();
        this.isReloading = true;

        try {
            if (!this.adapter) {
                this.adapter = new ObsidianTaskAdapter(this.app);
            }
            const adapter = this.adapter;
            const fileExcludeFilter = this.userOptionModel.get("excludePaths") || [];
            const fileIncludeFilter = this.userOptionModel.get("includePaths") || [];
            const fileIncludeTagsFilter = this.userOptionModel.get("fileIncludeTags") || [];
            const fileExcludeTagsFilter = this.userOptionModel.get("fileExcludeTags") || [];

            for (const filePath of files) {
                const file = this.app.vault.getAbstractFileByPath(filePath);
                if (!(file instanceof TFile)) continue;

                // 优先使用 onFileChanged 回调缓存的 data/cache，零 I/O 同步提取任务
                const cached = this.fileCacheMap.get(filePath);
                if (cached) {
                    adapter.replaceFileTasksFast(filePath, cached.data, cached.cache);
                } else {
                    // 兜底：没有缓存时走异步 I/O 路径
                    await adapter.updateFileTasks(
                        file, fileIncludeFilter, fileExcludeFilter,
                        fileIncludeTagsFilter, fileExcludeTagsFilter
                    );
                }
            }
            // 处理完毕，清除已使用的缓存
            for (const filePath of files) {
                this.fileCacheMap.delete(filePath);
            }

            const taskList = adapter.getTaskList();
            const changedFilePaths = new Set(files);

            // 只解析变更文件中的新任务，其他文件的任务保持已解析状态
            // 避免对已解析任务重复调用 parseTasks 导致日期等字段被覆盖
            const changedTasks = taskList.filter(t => changedFilePaths.has(t.path));
            const unchangedTasks = taskList.filter(t => !changedFilePaths.has(t.path));

            const parsedChangedTasks = await this.parseTasks(changedTasks);

            // Handle specific task files on incremental update
            const useSpecificTaskFiles = this.userOptionModel.get("useSpecificTaskFiles");
            let specificFilePaths: Set<string> = new Set();
            if (useSpecificTaskFiles) {
                const specificTaskFiles = this.userOptionModel.get("specificTaskFiles") as SpecificTaskFile[];
                if (specificTaskFiles && specificTaskFiles.length > 0) {
                    specificFilePaths = new Set(specificTaskFiles.filter(f => f.enabled && f.path).map(f => f.path));
                    await this.incrementalSpecificTaskFileUpdate(specificTaskFiles, changedFilePaths, changedTasks);
                }
            }

            const allTasks = [...unchangedTasks, ...parsedChangedTasks];
            let filteredTasks = this.filterTasks(allTasks);

            // Exclude non-overdue tasks from specific task files from the main task list
            if (useSpecificTaskFiles && specificFilePaths.size > 0) {
                filteredTasks = filteredTasks.filter(t => {
                    if (specificFilePaths.has(t.path)) {
                        return t.status === TaskStatus.overdue;
                    }
                    return true;
                });
            }

            this.taskListModel.set({ taskList: filteredTasks });
            this.rebuildTaskStatusMap();
        } catch (reason) {
            new Notice(t((this.userOptionModel.get("language") || "en") as "en" | "zh").errorGeneratingTasks + reason, 5000);
            console.error("Error reloading tasks:", reason);
        } finally {
            this.isReloading = false;
            this.immediateProcessed = false;
            // 处理期间可能有新文件变更进来，继续调度
            if (this.pendingFiles.size > 0) {
                this.scheduleIncrementalUpdate();
            }
        }
    }

    /**
     * 文件删除时，移除该文件对应的所有任务并更新视图
     */
    private onFileDeleted = (file: TFile) => {
        if (!file?.path) return;
        if (!this.adapter) return;

        try {
            this.adapter.removeFileTasks(file.path);

            const taskList = this.adapter.getTaskList();
            const filteredTasks = this.filterTasks(taskList);
            this.taskListModel.set({ taskList: filteredTasks });
            this.rebuildTaskStatusMap();
        } catch (reason) {
            new Notice(t((this.userOptionModel.get("language") || "en") as "en" | "zh").errorGeneratingTasks + reason, 5000);
            console.error("Error handling file deletion:", reason);
        }
    };

    /**
     * 全量重建任务列表。如果已有 reload 正在进行，等待其完成。
     */
    private async doFullReload() {
        if (this.isReloading) {
            return;
        }
        this.isReloading = true;

        if (!this.adapter) {
            this.adapter = new ObsidianTaskAdapter(this.app);
        }
        const adapter = this.adapter;

        try {
            const fileExcludeFilter = this.userOptionModel.get("excludePaths") || [];
            const fileIncludeFilter = this.userOptionModel.get("includePaths") || [];
            const fileIncludeTagsFilter = this.userOptionModel.get("fileIncludeTags") || [];
            const fileExcludeTagsFilter = this.userOptionModel.get("fileExcludeTags") || [];

            await adapter.generateTasksList(fileIncludeFilter, fileExcludeFilter, fileIncludeTagsFilter, fileExcludeTagsFilter);

            const taskList = adapter.getTaskList();
            const specificTaskFileTasks = await this.parseSpecificTaskFiles();
            const specificFilePaths = new Set<string>();
            for (const entry of specificTaskFileTasks) {
                specificFilePaths.add(entry.path);
            }

            const allTasks = [...taskList, ...specificTaskFileTasks];
            const tasks = await this.parseTasks(allTasks);
            let filteredTasks = this.filterTasks(tasks);

            // Exclude non-overdue tasks from specific task files from the main task list
            // Overdue tasks from specific task files should still appear in the Overdue panel
            filteredTasks = filteredTasks.filter(t => {
                if (specificFilePaths.has(t.path)) {
                    // Only keep overdue tasks from specific task files in the main list
                    return t.status === TaskStatus.overdue;
                }
                return true;
            });

            // Build the specific task file data for display
            const specificTaskFileData = await this.buildSpecificTaskFileData(specificTaskFileTasks);

            const taskfiles = this.userOptionModel.get("taskFiles");
            this.taskListModel.set({
                taskList: filteredTasks,
                specificTaskFileData: specificTaskFileData,
            });
            this.rebuildTaskStatusMap();
            this.userOptionModel.set({ taskFiles: taskfiles || [] });

        } catch (reason) {
            new Notice(t((this.userOptionModel.get("language") || "en") as "en" | "zh").errorGeneratingTasks + reason, 5000);
            console.error("Error reloading tasks:", reason);
        } finally {
            this.isReloading = false;
        }
    }

    /**
     * Parse all enabled specific task files, bypassing include/exclude path filters.
     * Returns raw task data (before status/date parsing).
     */
    private async parseSpecificTaskFiles(): Promise<TaskDataModel[]> {
        const useSpecificTaskFiles = this.userOptionModel.get("useSpecificTaskFiles");
        const specificTaskFiles = this.userOptionModel.get("specificTaskFiles") as SpecificTaskFile[];
        if (!useSpecificTaskFiles || !specificTaskFiles || specificTaskFiles.length === 0) {
            return [];
        }

        const enabledFiles = specificTaskFiles.filter(f => f.enabled && f.path);
        if (enabledFiles.length === 0) return [];

        if (!this.adapter) {
            this.adapter = new ObsidianTaskAdapter(this.app);
        }
        const result: TaskDataModel[] = [];

        for (const stf of enabledFiles) {
            const file = this.app.vault.getAbstractFileByPath(stf.path);
            if (!(file instanceof TFile)) continue;
            try {
                await this.adapter.parseSingleFileIntoTarget(file, result);
            } catch (e) {
                console.error(`Error parsing specific task file ${stf.path}:`, e);
            }
        }

        return result;
    }

    /**
     * Build the specific task file data structure for display panels.
     * Groups tasks by alias and filters out completed/cancelled tasks.
     */
    private async buildSpecificTaskFileData(specificTaskFileTasks: TaskDataModel[]): Promise<Array<{ alias: string; tasks: TaskDataModel[] }>> {
        const specificTaskFiles = this.userOptionModel.get("specificTaskFiles") as SpecificTaskFile[];
        if (!specificTaskFiles || specificTaskFiles.length === 0) return [];

        const enabledFiles = specificTaskFiles.filter(f => f.enabled && f.path);
        const result: Array<{ alias: string; tasks: TaskDataModel[] }> = [];

        for (const stf of enabledFiles) {
            const fileTasks = specificTaskFileTasks.filter(t => t.path === stf.path);
            // Parse the tasks (date, status, etc.)
            const parsedTasks = await this.parseTasks(fileTasks);
            // Filter out completed/cancelled tasks
            const activeTasks = parsedTasks.filter(t => {
                const hideStatus = this.userOptionModel.get("hideStatusTasks") || [];
                if (hideStatus.includes(t.statusMarker)) return false;
                if (hideStatus.some(m => TaskStatusMarkerMap[m as keyof typeof TaskStatusMarkerMap] === t.status)) return false;
                return true;
            });
            // Sort tasks
            const sortFn = this.getSortFunction();
            activeTasks.sort(sortFn);

            result.push({
                alias: stf.alias || stf.path,
                tasks: activeTasks,
            });
        }

        return result;
    }

    private getSortFunction(): (a: TaskDataModel, b: TaskDataModel) => number {
        const sortStr = this.userOptionModel.get("sort") as string;
        try {
            // eslint-disable-next-line no-new-func
            return new Function(`return ${sortStr}`)() as (a: TaskDataModel, b: TaskDataModel) => number;
        } catch {
            return (t1, t2) => t1.order <= t2.order ? -1 : 1;
        }
    }

    /**
     * Incrementally update specific task file data when files change.
     * Re-parses only the specific task files that were changed.
     */
    private async incrementalSpecificTaskFileUpdate(
        specificTaskFiles: SpecificTaskFile[],
        changedFilePaths: Set<string>,
        changedTasks: TaskDataModel[]
    ): Promise<void> {
        if (!this.adapter) {
            this.adapter = new ObsidianTaskAdapter(this.app);
        }
        const enabledFiles = specificTaskFiles.filter(f => f.enabled && f.path);
        const changedSpecificFiles = enabledFiles.filter(f => changedFilePaths.has(f.path));

        if (changedSpecificFiles.length === 0) return;

        // Re-parse all changed specific task files
        const specificTaskFileTasks: TaskDataModel[] = [];
        for (const stf of changedSpecificFiles) {
            const file = this.app.vault.getAbstractFileByPath(stf.path);
            if (!(file instanceof TFile)) continue;
            try {
                await this.adapter.parseSingleFileIntoTarget(file, specificTaskFileTasks);
            } catch (e) {
                console.error(`Error parsing specific task file ${stf.path}:`, e);
            }
        }

        // Build specific task file data
        const specificTaskFileData = await this.buildSpecificTaskFileData(specificTaskFileTasks);

        // Update the task list model
        const currentData = this.taskListModel.get("specificTaskFileData") as Array<{ alias: string; tasks: TaskDataModel[] }> || [];
        const mergedData = [...currentData];
        for (const newData of specificTaskFileData) {
            const idx = mergedData.findIndex(d => d.alias === newData.alias);
            if (idx >= 0) {
                mergedData[idx] = newData;
            } else {
                mergedData.push(newData);
            }
        }

        this.taskListModel.set({
            specificTaskFileData: mergedData,
            taskList: this.taskListModel.get("taskList"),
        }, { silent: true });
    }

    /**
     * 从 model 中的 taskList 重建任务状态缓存。
     * key = ${path}:${line}，value = statusMarker。
     * 用于 onEditorChange 的 O(1) 快速查找。
     */
    private rebuildTaskStatusMap() {
        this.taskStatusMap.clear();
        const taskList: TaskDataModel[] = this.taskListModel.get("taskList") as TaskDataModel[];
        if (!taskList) return;
        for (const task of taskList) {
            const key = `${task.path}:${task.position.start.line}`;
            this.taskStatusMap.set(key, task.statusMarker);
        }
    }

    filterTasks(taskList: TaskDataModel[]) {
        return taskList
            /**
             * Status Filters
             */
            .filter((task: TaskDataModel) => {
                if (this.userOptionModel.get("hideStatusTasks")?.length === 0) return true;
                const hideStatusTasks = this.userOptionModel.get("hideStatusTasks");
                if (hideStatusTasks?.includes(task.statusMarker)) return false;
                if (hideStatusTasks?.some(m => TaskStatusMarkerMap[m as keyof typeof TaskStatusMarkerMap] === task.status)) return false;
                return true;
            })
            /**
             * Tag Filters
             */
            .filter((task) => {
                if (!this.userOptionModel.get("useIncludeTags")) return true;
                const tagIncludes = this.userOptionModel.get("taskIncludeTags");
                if (!tagIncludes) return true;
                if (tagIncludes.length === 0) return true;
                if (tagIncludes.some(tag => task.tags.includes(tag))) return true;
                return false;
            })
            .filter((task) => {
                if (!this.userOptionModel.get("useExcludeTags")) return true;
                const tagExcludes = this.userOptionModel.get("taskExcludeTags");
                if (!tagExcludes) return true;
                if (tagExcludes.length === 0) return true;
                if (tagExcludes.every(tag => !task.tags.includes(tag))) return true;
                return false;
            })
            /**
             * Filter empty
             */
            .filter((task: TaskDataModel) => {
                if (!this.userOptionModel.get("filterEmpty")) return true;
                return task.visual && task.visual.trim() !== "";
            })

    }

    async parseTasks(taskList: TaskDataModel[]): Promise<TaskDataModel[]> {
        const stautsOrder = this.userOptionModel.get("taskStatusOrder");
        const dailyNoteFormatParser = TaskMapable.dailyNoteTaskParser(
            this.userOptionModel.get("dailyNoteFormat"),
            this.userOptionModel.get("dailyNoteFolder"));
        const forward = this.userOptionModel.get("forward");
        const convertTime = this.userOptionModel.get("convert24HourTimePrefix");

        const result: TaskDataModel[] = new Array(taskList.length);
        for (let i = 0; i < taskList.length; i++) {
            let task = taskList[i];
            task = TaskMapable.tasksPluginTaskParser(task);
            task = TaskMapable.dataviewTaskParser(task);
            task = dailyNoteFormatParser(task);
            task = TaskMapable.tagsParser(task);
            task = TaskMapable.taskLinkParser(task);
            task = TaskMapable.remainderParser(task);
            task = TaskMapable.postProcessor(task);

            // Forward: show unplanned and overdue tasks in today's part
            if (forward) {
                if (task.status === TaskStatus.unplanned) {
                    task.dates.set(TaskStatus.unplanned, moment());
                } else if (task.status === TaskStatus.done && !task.completion &&
                    !task.due && !task.start && !task.scheduled && !task.created) {
                    task.dates.set("done-unplanned", moment());
                } else if (task.status === TaskStatus.overdue &&
                    !TaskMapable.filterDate(moment())(task)) {
                    task.dates.set(TaskStatus.overdue, moment());
                }
            }

            // Set order based on status
            if (stautsOrder && stautsOrder.includes(task.status)) {
                task.order = stautsOrder.indexOf(task.status) + 1;
            }

            // Convert 24-hour time prefix to 12-hour
            if (convertTime && task.visual && task.visual.length >= 5) {
                const timePrefix = moment(task.visual.substring(0, 5), "HH:mm", true);
                if (timePrefix.isValid()) {
                    const updatedTimePrefix = timePrefix.format("h:mm a");
                    task.visual = updatedTimePrefix + task.visual.substring(5);
                }
            }

            result[i] = task;
        }

        return result;
    }

    getViewType(): string {
        return TIMELINE_VIEW;
    }

    getDisplayText(): string {
        return t(this.userOptionModel.get("language") || "en").tasksTimeline;
    }

    getIcon(): string {
        return "calendar-clock";
    }
}
