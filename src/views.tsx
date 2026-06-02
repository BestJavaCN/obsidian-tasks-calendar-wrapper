import { Model } from "backbone";
import { CachedMetadata, ItemView, moment, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { ObsidianBridge } from 'Obsidian-Tasks-Timeline/src/obsidianbridge';
import { ObsidianTaskAdapter } from "Obsidian-Tasks-Timeline/src/taskadapter";
import { createRoot, Root } from 'react-dom/client';
import * as TaskMapable from 'utils/taskmapable';
import { TaskDataModel, TaskStatus, TaskStatusMarkerMap } from "utils/tasks";
import { defaultUserOptions, UserOption } from "./settings";
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
    });

    private isReloading: boolean = false;
    private userOptionModel = new Model({ ...defaultUserOptions });
    private adapter: ObsidianTaskAdapter | null = null;
    static view: TasksTimelineView | null = null;

    // 增量更新防抖：收集短时间内变化的文件，批量处理
    private pendingFiles: Set<string> = new Set();
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private static readonly DEBOUNCE_MS = 300;

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
        this.registerEvent(this.app.workspace.on("window-open", this.onReloadTasks));

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
     * 增量更新：当文件内容变更后，只重新解析该文件的任务
     */
    private onFileChanged = (file: TFile, _data: string, _cache: CachedMetadata) => {
        if (!file?.path) return;
        this.pendingFiles.add(file.path);
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(async () => {
            const files = [...this.pendingFiles];
            this.pendingFiles.clear();
            this.debounceTimer = null;

            if (this.isReloading) return;
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
                    if (file instanceof TFile) {
                        await adapter.updateFileTasks(
                            file, fileIncludeFilter, fileExcludeFilter,
                            fileIncludeTagsFilter, fileExcludeTagsFilter
                        );
                    }
                }

                const taskList = adapter.getTaskList();
                const changedFilePaths = new Set(files);

                // 只解析变更文件中的新任务，其他文件的任务保持已解析状态
                // 避免对已解析任务重复调用 parseTasks 导致日期等字段被覆盖
                const changedTasks = taskList.filter(t => changedFilePaths.has(t.path));
                const unchangedTasks = taskList.filter(t => !changedFilePaths.has(t.path));

                const parsedChangedTasks = await this.parseTasks(changedTasks);
                const allTasks = [...unchangedTasks, ...parsedChangedTasks];
                const filteredTasks = this.filterTasks(allTasks);

                this.taskListModel.set({ taskList: filteredTasks });
            } catch (reason) {
                new Notice(t((this.userOptionModel.get("language") || "en") as "en" | "zh").errorGeneratingTasks + reason, 5000);
                console.error("Error reloading tasks:", reason);
            } finally {
                this.isReloading = false;
            }
        }, TasksTimelineView.DEBOUNCE_MS);
    };

    /**
     * 文件删除时，移除该文件对应的所有任务并更新视图
     */
    private onFileDeleted = (file: TFile) => {
        if (!file?.path) return;
        if (!this.adapter) return;

        this.adapter.removeFileTasks(file.path);

        const taskList = this.adapter.getTaskList();
        const filteredTasks = this.filterTasks(taskList);
        this.taskListModel.set({ taskList: filteredTasks });
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
            const tasks = await this.parseTasks(taskList);
            const filteredTasks = this.filterTasks(tasks);

            const taskfiles = this.userOptionModel.get("taskFiles");
            this.taskListModel.set({ taskList: filteredTasks });
            this.userOptionModel.set({ taskFiles: taskfiles || [] });

        } catch (reason) {
            new Notice(t((this.userOptionModel.get("language") || "en") as "en" | "zh").errorGeneratingTasks + reason, 5000);
            console.error("Error reloading tasks:", reason);
        } finally {
            this.isReloading = false;
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

        let processedTasks = taskList
            .map(TaskMapable.tasksPluginTaskParser)
            .map(TaskMapable.dataviewTaskParser)
            .map(dailyNoteFormatParser)
            .map(TaskMapable.tagsParser)
            .map(TaskMapable.remainderParser)
            .map(TaskMapable.postProcessor)
            //.map(TaskMapable.taskLinkParser)

            /**
             * Option Forward
             * Current behavior: show unplanned and overdue tasks in today's part.
             */
            .map((task: TaskDataModel): TaskDataModel => {
                if (!forward) return task;
                if (task.status === TaskStatus.unplanned) {
                    task.dates.set(TaskStatus.unplanned, moment());
                } else if (task.status === TaskStatus.done && !task.completion &&
                    !task.due && !task.start && !task.scheduled && !task.created) {
                    task.dates.set("done-unplanned", moment());
                } else if (task.status === TaskStatus.overdue &&
                    !TaskMapable.filterDate(moment())(task)) {
                    task.dates.set(TaskStatus.overdue, moment());
                }
                return task;
            })
            /**
             * Post processer
             */
            .map((task: TaskDataModel): TaskDataModel => {
                if (!stautsOrder) return task;
                if (stautsOrder.includes(task.status)) {
                    task.order = stautsOrder.indexOf(task.status) + 1;
                }
                return task;
            });

        if (this.userOptionModel.get("convert24HourTimePrefix")) {
            processedTasks = processedTasks.map((task: TaskDataModel): TaskDataModel => {
                if (!task.visual || task.visual.length < 5) return task;
                const timePrefix = moment(task.visual.substring(0, 5), "HH:mm", true);
                if (!timePrefix.isValid()) return task;
                const updatedTimePrefix = timePrefix.format("h:mm a");
                task.visual = updatedTimePrefix + task.visual.substring(5);
                return task;
            });
        }

        return processedTasks;
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
