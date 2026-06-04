import { App, CachedMetadata, FrontMatterCache, LinkCache, ListItemCache, Pos, SectionCache, TagCache, TFile } from "obsidian";
import { Link } from "../../dataview-util/markdown";
import { NON_STF_TASK, TaskDataModel, TaskRegularExpressions } from "../../utils/tasks";

export class ObsidianTaskAdapter {
    private app: App;
    private tasksList: TaskDataModel[] = [];
    constructor(app: App) {
        this.app = app;

        this.generateTasksList = this.generateTasksList.bind(this);
        this.getTaskList = this.getTaskList.bind(this);
        this.fromItemCache = this.fromItemCache.bind(this);
        this.fromLine = this.fromLine.bind(this);
        this.updateFileTasks = this.updateFileTasks.bind(this);

    }

    getTaskList() {
        return [...this.tasksList];
    }

    /**
     * Parse a file and append its tasks directly to the internal task list.
     * Used for STF files that bypass include/exclude path filters.
     */
    async parseFileIntoTaskList(file: TFile) {
        await this.parseFileIntoTarget(file, this.tasksList);
    }

    private fileMatchesFilters(file: TFile, includeFilter: string[], pathFilter: string[], includeTags: string[], excludeTags: string[]): boolean {
        if (includeFilter.length !== 0 && !this.includePathsFilter(includeFilter)(file)) return false;
        if (pathFilter.length !== 0 && !this.pathsFilter(pathFilter)(file)) return false;
        if (includeTags.length !== 0 && !this.fileIncludeTagsFilter(includeTags)(file)) return false;
        if (excludeTags.length !== 0 && !this.fileExcludeTagsFilter(excludeTags)(file)) return false;
        return true;
    }

    pathsFilter(filter: string[]) {
        const isParent = (parent: string, path: string) => {
            if (parent.length > path.length) return false;
            const paths = path.split('/');
            const parents = parent.split('/');
            return parents.every((v, i) => v === paths[i]);
        };
        return (file: TFile) => {
            const fileName = file.path;
            return !filter.some((path) => isParent(path, fileName));
        }
    }

    includePathsFilter(filter: string[]) {
        const isParent = (parent: string, path: string) => {
            if (parent.length > path.length) return false;
            const paths = path.split('/');
            const parents = parent.split('/');
            return parents.every((v, i) => v === paths[i]);
        };
        return (file: TFile) => {
            const fileName = file.path;
            return filter.some((path) => isParent(path, fileName));
        }
    }

    fileIncludeTagsFilter(filter: string[]) {
        return (file: TFile) => {
            const cache = this.app.metadataCache.getFileCache(file);
            const tags = cache?.tags?.map(t => t.tag);
            return filter.some(tag => tags?.includes(tag));
        }
    }

    fileExcludeTagsFilter(filter: string[]) {
        return (file: TFile) => {
            const cache = this.app.metadataCache.getFileCache(file);
            const tags = cache?.tags?.map(t => t.tag);
            return filter.every(tag => !tags?.includes(tag));
        }
    }

    async parseFileIntoTarget(file: TFile, targetArray: TaskDataModel[]) {
        const link = Link.file(file.path);
        try {
            const content = await this.app.vault.cachedRead(file);
            await this.waitForFileCache(file);
            const cache = this.app.metadataCache.getFileCache(file);
            cache?.listItems?.forEach(
                this.fromItemCache(link, file.path, content, cache.sections, cache.links, cache.frontmatter, cache.tags, targetArray)
            );
        } catch (reason) {
            console.error("Read file from obsidian cache failed: " + reason);
        }
    }


    async generateTasksList(includeFilter: string[], pathFilter: string[], includeTags: string[], excludeTags: string[]) {
        this.tasksList.length = 0;
        const files = this.app.vault.getMarkdownFiles();

        const hasIncludeFilter = includeFilter.length !== 0;
        const hasPathFilter = pathFilter.length !== 0;
        const hasIncludeTags = includeTags.length !== 0;
        const hasExcludeTags = excludeTags.length !== 0;

        // 合并多个 filter 为单次遍历，避免创建中间数组
        const filteredFiles = (hasIncludeFilter || hasPathFilter || hasIncludeTags || hasExcludeTags)
            ? files.filter(file => {
                if (hasIncludeFilter && !this.includePathsFilter(includeFilter)(file)) return false;
                if (hasPathFilter && !this.pathsFilter(pathFilter)(file)) return false;
                if (hasIncludeTags && !this.fileIncludeTagsFilter(includeTags)(file)) return false;
                if (hasExcludeTags && !this.fileExcludeTagsFilter(excludeTags)(file)) return false;
                return true;
            })
            : files;

        // Process files in batches to avoid overwhelming the system
        const BATCH_SIZE = 20;
        for (let i = 0; i < filteredFiles.length; i += BATCH_SIZE) {
            const batch = filteredFiles.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (file: TFile) => {
                await this.parseFileIntoTarget(file, this.tasksList);
            }));
        }
    }

    /**
     * 增量更新单个文件的任务：移除该文件旧任务，重新解析并加入新任务。
     * 如果文件不匹配当前过滤条件，则仅移除旧任务。
     */
    async updateFileTasks(file: TFile, includeFilter: string[], pathFilter: string[], includeTags: string[], excludeTags: string[]) {
        // 移除该文件的旧任务
        this.tasksList = this.tasksList.filter(t => t.path !== file.path);

        if (!this.fileMatchesFilters(file, includeFilter, pathFilter, includeTags, excludeTags)) return;

        const newTasks: TaskDataModel[] = [];
        await this.parseFileIntoTarget(file, newTasks);
        this.tasksList.push(...newTasks);
    }

    /**
     * 同步方法：利用 metadataCache.on('changed') 回调提供的 data 和 cache，
     * 直接从内存中提取该文件的任务，无需任何文件 I/O。
     * 仅用于增量更新路径，不检查文件级过滤条件（由调用方保证）。
     */
    extractTasksFromCache(filePath: string, data: string, cache: CachedMetadata): TaskDataModel[] {
        const tasks: TaskDataModel[] = [];
        const link = Link.file(filePath);
        cache?.listItems?.forEach(
            this.fromItemCache(link, filePath, data, cache.sections, cache.links, cache.frontmatter, cache.tags, tasks)
        );
        return tasks;
    }

    /**
     * 增量更新路径的快速入口：用缓存的 data/cache 替换文件的任务，零 I/O。
     * 不检查文件级过滤条件（增量更新场景下过滤条件不会突变）。
     */
    replaceFileTasksFast(filePath: string, data: string, cache: CachedMetadata) {
        // 移除该文件的旧任务
        this.tasksList = this.tasksList.filter(t => t.path !== filePath);
        // 直接从内存提取新任务
        const newTasks = this.extractTasksFromCache(filePath, data, cache);
        this.tasksList.push(...newTasks);
    }

    /**
     * 文件被删除时，移除该文件对应的所有任务
     */
    removeFileTasks(filePath: string) {
        this.tasksList = this.tasksList.filter(t => t.path !== filePath);
    }

    private async waitForFileCache(file: TFile, timeoutMs: number = 5000): Promise<void> {
        if (this.app.metadataCache.getFileCache(file) !== null) return;

        const startTime = Date.now();
        return new Promise(resolve => {
            const check = () => {
                if (this.app.metadataCache.getFileCache(file) !== null) {
                    resolve();
                } else if (Date.now() - startTime > timeoutMs) {
                    console.warn("Metadata cache timeout for file:", file.path);
                    resolve();
                } else {
                    setTimeout(check, 50);
                }
            };
            check();
        });
    }

    /**
     * This function takes all known list items as input and passes them to fromLine.
     * @param link A Link object points to the file where the list item belongs. It can also be constructed from the file path,
     * the only reason this is an augment is to avoid constructing one same Link for every item.
     * @param filePath The path of the file where the list item belongs.
     * @param fileContent The file content for extracting the raw texts for list items. The reason this is an augment is to avoiding
     * reading one same file for every item.
     * @param sections The section cache from Obsidian.
     * @param links The link cache from Obsidian.
     * @param fontmatter The fontmatter cache from Obsidian.
     * @param tags The tag cache from Obsidian.
     * @returns This funcion directly modify this.taskList. 
     */
    private fromItemCache(link: Link, filePath: string, fileContent: string,
        sections?: SectionCache[], links?: LinkCache[], fontmatter?: FrontMatterCache, tagsCache?: TagCache[],
        targetArray?: TaskDataModel[]) {
        return (item: ListItemCache) => {
            if (!(item.task)) return null;
            const itemPos = item.position;

            const findParent = () => {
                if (!sections) return null;
                if (item.parent > 0) {
                    for (const s of sections) {
                        if (s.position.start.line === item.parent) return s;
                    }
                } else {
                    let p = -1;
                    let parentHeader = null;
                    for (const s of sections) {
                        if (s.type === "heading" && s.position.start.line > p && s.position.start.line < item.position.start.line) {
                            parentHeader = s;
                            p = parentHeader.position.start.line;
                        }
                    }
                    return parentHeader;
                }
                return null;
            };

            const findOutLinks = (line: number) => {
                if (!links) return null;
                return links.filter(s => s.position.start.line === line);
            };

            const findTags = (line: number): string[] | null => {
                if (!tagsCache) return null;
                return tagsCache.filter(t => t.position.start.line === line).map(s => s.tag);
            };

            const sliceFileContent = (pos: Pos) => {
                return fileContent.slice(pos.start.offset, pos.end.offset);
            };

            const itemText = sliceFileContent(itemPos);
            const parentItem = findParent();
            const outLinks = findOutLinks(itemPos.start.line);
            const parentLink = (parentItem) ?
                link.withSectionCache(parentItem, sliceFileContent(parentItem?.position)) : link;
            const outLinkLinks = (outLinks) ?
                outLinks.map(v => Link.withLinkCache(v)) : [];

            const tags = findTags(itemPos.start.line);

            const taskItem = this.fromLine(itemText, filePath, parentLink, itemPos, outLinkLinks, fontmatter, tags || []);
            if (taskItem) {
                (targetArray || this.tasksList).push(taskItem);
            }
        }
    }
    /**
     * This function parse the raw text of a list item and judge if it is a task item.
     * If it is a task item, it extract only basic information to construct a TaskDataModel.
     * All other information should be in the TaskDataModel.text field.
     * @param line The raw text of the list item, including the list markers
     * @param filePath The file path where the list item is from.
     * @param parent A Link object points to the parent section of the list item.
     * @param position A Pos object from Obsidian.
     * @param outLinks Links from Obsidian.
     * //@param children 
     * //@param annotated 
     * @param frontMatter The yaml data in the header of the file where the list item belongs.
     * @param tags Tag list contained in the list item.
     * @returns A TaskDataModel with basic information if the list item is a Task, null if it is not.
     */
    private fromLine(
        line: string,
        filePath: string,
        parent: Link,
        position: Pos,
        outLinks: Link[],
        //children: TaskDataModel[],
        //annotated: boolean,
        frontMatter: Record<string, string> | undefined,
        tags: string[],
    ): TaskDataModel | null {
        // Check the line to see if it is a markdown task.
        const regexMatch = line.match(TaskRegularExpressions.taskRegex);
        if (regexMatch === null) {
            return null;
        }

        // match[4] includes the whole body of the task after the brackets.
        const body = regexMatch[4].trim();

        let description = body;
        //const indentation = regexMatch[1]; // before - [ ]
        const listMarker = regexMatch[2]; // - for - [ ]

        // Get the status of the task.
        const statusString = regexMatch[3]; // x for - [x]
        //const status = statusString;// StatusRegistry.getInstance().bySymbolOrCreate(statusString);

        // Match for block link and remove if found. Always expected to be
        // at the end of the line.
        const blockLinkMatch = description.match(TaskRegularExpressions.blockLinkRegex);
        const blockLink = blockLinkMatch !== null ? blockLinkMatch[0] : '';

        if (blockLink !== '') {
            description = description.replace(TaskRegularExpressions.blockLinkRegex, '').trim();
        }

        if (frontMatter) {
            if (frontMatter["tag"] && typeof (frontMatter["tag"]) === "string") {
                // add # as prefix if there is not such prefix
                // But it seems unnecessary to judge cuz in obsidian # prefix is not allowed for the frontmatter tags
                const frontmatterTagPrefix = frontMatter["tag"].startsWith("#") ? "" : "#";
                tags.push(frontmatterTagPrefix + frontMatter["tag"]);
            }
            if (frontMatter["tags"] && Array.isArray(frontMatter["tags"])) {
                // add # as prefix if there is not such prefix
                (frontMatter["tags"] as unknown as Array<string>).forEach(t => tags.push(t.startsWith("#") ? "" : "#" + t));
            }
        }

        tags = [...new Set(tags)];

        const taskItem: TaskDataModel = {
            symbol: listMarker,
            link: parent,
            section: parent,
            text: line,
            visual: description.trim(),
            tags: tags,
            line: position.start.line,
            lineCount: position.end.line - position.start.line + 1,
            list: position.start.line,
            outlinks: outLinks,
            path: filePath,
            children: [],
            task: true,
            annotated: false,
            position: position,
            subtasks: [],
            real: true,
            header: parent,
            status: statusString,
            statusMarker: statusString,
            checked: description.replace(' ', '').length !== 0,
            completed: statusString === 'x',
            fullyCompleted: statusString !== ' ',
            dailyNote: false,
            order: 0,
            priority: "",
            //happens: new Map<string, string>(),
            recurrence: "",
            fontMatter: frontMatter || {},
            due: undefined,
            scheduled: undefined,
            start: undefined,
            completion: undefined,
            dates: new Map(),
            stfAlias: NON_STF_TASK,
        };
        return taskItem;
    }
}