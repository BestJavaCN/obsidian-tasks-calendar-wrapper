export type Language = "en" | "zh";

export interface Translations {
    // Settings headings
    timelineSettings: string;
    uiSettings: string;
    taskItemVisualizationSettings: string;
    otherSettings: string;

    // UI settings
    openViewOnStartup: string;
    openViewOnStartupDesc: string;
    useBuiltinStyle: string;
    useBuiltinStyleDesc: string;
    enableCounters: string;
    enableCountersDesc: string;
    countersBehavior: string;
    countersBehaviorDesc: string;
    enableQuickEntry: string;
    enableQuickEntryDesc: string;
    quickEntryPosition: string;
    quickEntryPositionDesc: string;
    tasksFiles: string;
    tasksFilesDesc: string;
    inbox: string;
    inboxDesc: string;
    sectionForNewTasks: string;
    sectionForNewTasksDesc: string;
    dailyNoteFolder: string;
    dailyNoteFolderDesc: string;
    dailyNoteFormat: string;
    dailyNoteFormatDesc: string;
    enableYearHeader: string;
    enableYearHeaderDesc: string;
    hideStatusTasks: string;
    hideStatusTasksDesc: string;
    forwardTasks: string;
    forwardTasksDesc: string;
    todayFocusOnLoad: string;
    todayFocusOnLoadDesc: string;
    activateFilterOnLoad: string;
    activateFilterOnLoadDesc: string;

    // Task item visualization settings
    useRelative: string;
    useRelativeDesc: string;
    useRecurrence: string;
    useRecurrenceDesc: string;
    usePriority: string;
    usePriorityDesc: string;
    useTags: string;
    useTagsDesc: string;
    hideTags: string;
    hideTagsDesc: string;
    useFilename: string;
    useFilenameDesc: string;
    useSection: string;
    useSectionDesc: string;

    // Other settings
    dateFormat: string;
    dateFormatDesc: string;
    sortBy: string;
    sortByDesc: string;
    convertTimePrefix: string;
    convertTimePrefixDesc: string;
    useTemplater: string;
    useTemplaterDesc: string;
    templaterTemplateFile: string;
    templaterTemplateFileDesc: string;
    useIncludeTags: string;
    useIncludeTagsDesc: string;
    taskIncludeFilters: string;
    taskIncludeFiltersDesc: string;
    fileIncludeTags: string;
    fileIncludeTagsDesc: string;
    useExcludeTags: string;
    useExcludeTagsDesc: string;
    taskExcludeFilters: string;
    taskExcludeFiltersDesc: string;
    fileExcludeTags: string;
    fileExcludeTagsDesc: string;
    excludePaths: string;
    excludePathsDesc: string;
    includePaths: string;
    includePathsDesc: string;
    filterEmpty: string;
    filterEmptyDesc: string;

    // Specific task files
    useSpecificTaskFiles: string;
    useSpecificTaskFilesDesc: string;
    addSpecificTaskFile: string;
    specificTaskFileAlias: string;
    specificTaskFileAliasDesc: string;
    specificTaskFilePath: string;
    specificTaskFilePathDesc: string;
    enableSpecificTaskFile: string;
    removeSpecificTaskFile: string;
    noSpecificTaskFiles: string;

    // Language setting
    language: string;
    languageDesc: string;

    // Dropdown options
    filterOption: string;
    focusOption: string;
    topOption: string;
    bottomOption: string;
    todayOption: string;
    noFiltersOption: string;
    todoFilterOption: string;
    overdueFilterOption: string;
    unplannedFilterOption: string;

    // Sort options
    sortStatusAsc: string;
    sortStatusDesc: string;
    sortTextAsc: string;
    sortTextDesc: string;
    sortStartAsc: string;
    sortStartDesc: string;
    sortDueAsc: string;
    sortDueDesc: string;
    sortTagsAsc: string;
    sortTagsDesc: string;

    // Tag modal
    tagAndColor: string;
    tagAndColorDesc: string;
    tagSettings: string;
    tagSettingsDesc: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    addPalette: string;
    notValidTag: string;
    colorEmpty: string;
    tagExists: string;

    // View & Command
    tasksTimeline: string;
    openTasksTimelineView: string;

    // Quick entry
    newTask: string;
    filter: string;
    enterYourTasks: string;
    selectNote: string;
    appendNewTask: string;
    focusOnToday: string;
    focusToday: string;
    filterType: string;
    from: string;
    to: string;
    priorities: string;
    high: string;
    medium: string;
    none: string;
    low: string;

    // Counters
    todo: string;
    overdue: string;
    unplanned: string;
    todoTasks: string;
    overdueTasks: string;
    unplannedTasks: string;

    // Task item
    modifyTask: string;
    createAt: string;
    startAt: string;
    scheduledTo: string;
    dueAt: string;
    completeAt: string;
    recurrent: string;
    priority: string;
    priorityLabel: string;
    noPriority: string;

    // Error / Notice messages
    errorParsingTasks: string;
    errorGeneratingTasks: string;
    noSuchFile: string;
    errorOpeningFile: string;
    somethingWentWrong: string;
    templaterNotFound: string;
    templaterNoTemplate: string;
    templateFileNotFound: string;
    fileNotCreated: string;
    templateNotApplied: string;
    errorCreatingFileTemplater: string;
    errorCreatingFile: string;
    errorWritingTask: string;
    errorReadingFile: string;

    // Create file modal
    createNewNote: string;
    createNewNoteConfirm: string;
    createBtn: string;
    cancelBtn: string;
}

const en: Translations = {
    timelineSettings: "Timeline Settings",
    uiSettings: "UI Settings",
    taskItemVisualizationSettings: "Task Item Visualization Settings",
    otherSettings: "Other Settings",

    openViewOnStartup: "Open View On Startup",
    openViewOnStartupDesc: "Open the view on startup or not.",
    useBuiltinStyle: "Use Builtin Style",
    useBuiltinStyleDesc: "Use builtin styles (the marker icons for task status) or not.\nIf disabled, styles defined by the theme you are using will be used.",
    enableCounters: "Enable Counters and Filters Panel",
    enableCountersDesc: "Use counters and filters on the quick entry panel or not.",
    countersBehavior: "Behavior of Counters and Filters Panel",
    countersBehaviorDesc: "Set the default behavior of the counter and filter buttons. Available choices are: *Filter* to filter other items out, or *Focus* to make selected items more clear.",
    enableQuickEntry: "Enable Quick Entry Panel",
    enableQuickEntryDesc: "Use quick entry panel or not.",
    quickEntryPosition: "Quick Entry Panel Position",
    quickEntryPositionDesc: "Where you like the entry panel to be, * Top means on top of the view, * Bottom means on bottom of the view, * Today means in today's view.",
    tasksFiles: "Tasks Files",
    tasksFilesDesc: "Task Files you would like to specify explicitly for quick entry panel. Make sure paths are separated by , .",
    inbox: "Inbox",
    inboxDesc: "Set a file as an 'Inbox' for task items from the quick entry panel. This file will be displayed on top of the file list.",
    sectionForNewTasks: "Section For New Tasks",
    sectionForNewTasksDesc: "Specify under which section the new task items should be appended.",
    dailyNoteFolder: "Daily Note Folder",
    dailyNoteFolderDesc: "Specify the folder where the daily notes are saved.",
    dailyNoteFormat: "Daily Note Format",
    dailyNoteFormatDesc: "Daily note file format. The format should be of moment format, see <a href=https://momentjs.com/docs/#/displaying/format/>docs of moment.js</a> for more details.",
    enableYearHeader: "Enable Year Header",
    enableYearHeaderDesc: "Display the year on top of tasks of that year or not.",
    hideStatusTasks: "Hide tasks of specific status.",
    hideStatusTasksDesc: "Provide comma split status markers, e.g.,: x, - \nUse [ ] if you would like to hide all tasks with marker [ ] or status todo.",
    forwardTasks: "Forward Tasks From Past",
    forwardTasksDesc: "Forward overdue tasks from the past and all unplanned tasks to display them on the today panel or not.",
    todayFocusOnLoad: "Today Focus On Load",
    todayFocusOnLoadDesc: "Activate today focus on load or not.",
    activateFilterOnLoad: "Activate Filter On Load",
    activateFilterOnLoadDesc: "Activate a filter or not.",

    useRelative: "Use Relative Date",
    useRelativeDesc: "Use relative date to describe the task dates or not.",
    useRecurrence: "Use Recurrence",
    useRecurrenceDesc: "Display the recurrence information of tasks or not.",
    usePriority: "Use Priority",
    usePriorityDesc: "Display the priority information of tasks or not.",
    useTags: "Use Tags",
    useTagsDesc: "Display the tags of tasks or not. Color palette can be defined for tags!",
    hideTags: "Hide Tags",
    hideTagsDesc: "Specify which tags are not necessary to display with a tag badge, note that all tag texts are remove from the displayed item text by default. Also note that the tags are just hided, not removed from the item.",
    useFilename: "Use Filename",
    useFilenameDesc: "Display which file the task is from or not.",
    useSection: "Use Section",
    useSectionDesc: "Display which section the task is from or not.",

    dateFormat: "Date Format",
    dateFormatDesc: "Specify format you would like to use for dates. Note that the format should be of moment format. See <a href=https://momentjs.com/docs/#/displaying/format/>docs of moment.js</a> for more details.",
    sortBy: "Sort By",
    sortByDesc: "Specify how you would like the taks item to be sorted inside a date.",
    convertTimePrefix: "Convert Time Prefix",
    convertTimePrefixDesc: "Convert 24 hour time prefix to 12 hour time with am/pm. \nFor example, 15:30 at the beginning of a task will become 3:30 pm.\nThis is applied after sorting, enabling a chronological ordering.",
    useTemplater: "Use Templater Plugin",
    useTemplaterDesc: "Use Templater plugin to create files with templates when creating new task files.",
    templaterTemplateFile: "Templater Template File",
    templaterTemplateFileDesc: "Select a template file from your vault to use when creating new task files.",
    useIncludeTags: "Use Include Tags",
    useIncludeTagsDesc: "Use tags filters to filter tasks without specific tags out or not.",
    taskIncludeFilters: "Task Include Filters",
    taskIncludeFiltersDesc: "Filter tasks with specific tags, only tasks with one or more of these tags are displayed.",
    fileIncludeTags: "File Include Tags",
    fileIncludeTagsDesc: "Filter tasks in specific files which contains one or more of these tags to be displayed.",
    useExcludeTags: "Use Exclude Tags",
    useExcludeTagsDesc: "Use tags filters to filters tasks with specific tags out or not.",
    taskExcludeFilters: "Task Exclude Filters",
    taskExcludeFiltersDesc: "Filter tasks without specific tags, only tasks **without any** if these tags are displayed.",
    fileExcludeTags: "File Exclude Tags",
    fileExcludeTagsDesc: "Filter tasks in specific files which **does not** contains any of these tags to be displayed.",
    excludePaths: "Exclude Paths",
    excludePathsDesc: "Exclude tasks match specific paths (folders, files). \n<p style=color:red;>NOTE that no prefix or trailing '/' needed, unless you want to filter the entire vault out.</p>",
    includePaths: "Include Paths",
    includePathsDesc: "Include tasks match specific paths (folders, files). \n<p style=color:red;>NOTE that no prefix or trailing '/' needed, unless you want to filter the entire vault out.</p>",
    filterEmpty: "Filter Empty",
    filterEmptyDesc: "Filter empty items out or not. If not, the raw text will be displayed.",

    useSpecificTaskFiles: "Enable Specific Task Files",
    useSpecificTaskFilesDesc: "Enable specific task files feature. This allows you to bypass include/exclude path settings and specify individual files to read tasks from.",
    addSpecificTaskFile: "Add Specific Task File",
    specificTaskFileAlias: "Alias",
    specificTaskFileAliasDesc: "The display name for this task file panel.",
    specificTaskFilePath: "File Path",
    specificTaskFilePathDesc: "The path to the markdown file.",
    enableSpecificTaskFile: "Enable",
    removeSpecificTaskFile: "Remove",
    noSpecificTaskFiles: "No specific task files configured.",

    language: "Language",
    languageDesc: "Select the display language of the plugin.",

    filterOption: "Filter",
    focusOption: "Focus",
    topOption: "top",
    bottomOption: "bottom",
    todayOption: "today",
    noFiltersOption: "No filters",
    todoFilterOption: "todo",
    overdueFilterOption: "overdue",
    unplannedFilterOption: "unplanned",

    sortStatusAsc: "status(ascending)",
    sortStatusDesc: "status(descending)",
    sortTextAsc: "text(ascending)",
    sortTextDesc: "text(descending)",
    sortStartAsc: "start time(ascending)",
    sortStartDesc: "start time(descending)",
    sortDueAsc: "due time(ascending)",
    sortDueDesc: "due time(descending)",
    sortTagsAsc: "tags(ascending)",
    sortTagsDesc: "tags(descending)",

    tagAndColor: "Tag and color",
    tagAndColorDesc: "Enter tag text (# included) in the text input and select color in the color selector.",
    tagSettings: "Tag",
    tagSettingsDesc: "Enter tag text (# included) in the text input and select color in the color selector.",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    addPalette: "Add a palette",
    notValidTag: "seems not a valid tag.",
    colorEmpty: "The color seems to be empty, maybe you forget to click the color picker.",
    tagExists: "{tag} already exists.",

    tasksTimeline: "Tasks Timeline",
    openTasksTimelineView: "Open Tasks Timeline View",

    newTask: "New Task",
    filter: "Filter",
    enterYourTasks: "Enter your tasks here",
    selectNote: "Select a note to add a new task to",
    appendNewTask: "Append new task to selected note",
    focusOnToday: "Focus On Today",
    focusToday: "Focus today",
    filterType: "Filter Type",
    from: "From:",
    to: "To:",
    priorities: "Priorities:",
    high: "High",
    medium: "Medium",
    none: "None",
    low: "Low",

    todo: "Todo",
    overdue: "Overdue",
    unplanned: "Unplanned",
    todoTasks: "Todo Tasks",
    overdueTasks: "Overdue Tasks",
    unplannedTasks: "Unplanned Tasks",

    modifyTask: "Modify Task",
    createAt: "create at",
    startAt: "start at",
    scheduledTo: "scheduled to",
    dueAt: "due at",
    completeAt: "complete at",
    recurrent: "recurrent",
    priority: "priority",
    priorityLabel: "Priority",
    noPriority: "No Priority",

    errorParsingTasks: "Error when parsing task items: ",
    errorGeneratingTasks: "Error when generating tasks from files: ",
    noSuchFile: "No such file: ",
    errorOpeningFile: "Error when trying open file: ",
    somethingWentWrong: "Something went wrong: ",
    templaterNotFound: "Templater plugin not found. Please enable Templater plugin.",
    templaterNoTemplate: "Please select a Templater template file in the plugin settings.",
    templateFileNotFound: "Template file not found: ",
    fileNotCreated: "File was not created properly by Templater.",
    templateNotApplied: "Template was not applied properly after multiple retries.",
    errorCreatingFileTemplater: "Error when creating file with Templater: ",
    errorCreatingFile: "Error when creating file ",
    errorWritingTask: "Error when writing new tasks to ",
    errorReadingFile: "Error when reading file ",

    createNewNote: "Create New Note",
    createNewNoteConfirm: "Do you want to create a note with the path ",
    createBtn: "Create",
    cancelBtn: "Cancel",
};

const zh: Translations = {
    timelineSettings: "时间线设置",
    uiSettings: "界面设置",
    taskItemVisualizationSettings: "任务项显示设置",
    otherSettings: "其他设置",

    openViewOnStartup: "启动时打开视图",
    openViewOnStartupDesc: "启动 Obsidian 时是否自动打开任务时间线视图。",
    useBuiltinStyle: "使用内置样式",
    useBuiltinStyleDesc: "是否使用内置样式（任务状态标记图标）。\n如果禁用，将使用您当前主题定义的样式。",
    enableCounters: "启用计数器和过滤器面板",
    enableCountersDesc: "是否在快速输入面板上使用计数器和过滤器。",
    countersBehavior: "计数器和过滤器面板行为",
    countersBehaviorDesc: "设置计数器和过滤器按钮的默认行为。可选：*Filter* 过滤掉其他项目，或 *Focus* 使选中项目更加突出。",
    enableQuickEntry: "启用快速输入面板",
    enableQuickEntryDesc: "是否使用快速输入面板。",
    quickEntryPosition: "快速输入面板位置",
    quickEntryPositionDesc: "设置快速输入面板的显示位置。* top 表示在视图顶部，* bottom 表示在视图底部，* today 表示在今日视图中。",
    tasksFiles: "任务文件",
    tasksFilesDesc: "为快速输入面板显式指定任务文件。请用逗号分隔路径。",
    inbox: "收件箱",
    inboxDesc: "设置一个文件作为快速输入面板任务项的「收件箱」。该文件将显示在文件列表的顶部。",
    sectionForNewTasks: "新任务添加区域",
    sectionForNewTasksDesc: "指定新任务项应添加到哪个标题区域下。",
    dailyNoteFolder: "日记文件夹",
    dailyNoteFolderDesc: "指定日记文件保存的文件夹。",
    dailyNoteFormat: "日记格式",
    dailyNoteFormatDesc: "日记文件格式。格式应为 moment.js 格式，详见 <a href=https://momentjs.com/docs/#/displaying/format/>moment.js 文档</a>。",
    enableYearHeader: "显示年份标题",
    enableYearHeaderDesc: "是否在每年任务顶部显示年份。",
    hideStatusTasks: "隐藏特定状态的任务",
    hideStatusTasksDesc: "提供逗号分隔的状态标记，例如：x, - \n使用 [ ] 可以隐藏所有标记为 [ ]（待办）的任务。",
    forwardTasks: "转发过期任务",
    forwardTasksDesc: "是否将过去的过期任务和所有未计划任务显示在今日面板上。",
    todayFocusOnLoad: "启动时聚焦今日",
    todayFocusOnLoadDesc: "启动时是否激活今日聚焦。",
    activateFilterOnLoad: "启动时激活过滤器",
    activateFilterOnLoadDesc: "启动时是否激活一个过滤器。",

    useRelative: "使用相对日期",
    useRelativeDesc: "是否使用相对日期来描述任务日期。",
    useRecurrence: "显示重复信息",
    useRecurrenceDesc: "是否显示任务的重复信息。",
    usePriority: "显示优先级",
    usePriorityDesc: "是否显示任务的优先级信息。",
    useTags: "显示标签",
    useTagsDesc: "是否显示任务标签。可以为标签定义颜色调色板！",
    hideTags: "隐藏标签",
    hideTagsDesc: "指定哪些标签不需要显示标签徽章。注意：所有标签文本默认会从显示的项目文本中移除。另请注意，标签只是被隐藏，而非从项目中删除。",
    useFilename: "显示文件名",
    useFilenameDesc: "是否显示任务来自哪个文件。",
    useSection: "显示区域",
    useSectionDesc: "是否显示任务来自哪个标题区域。",

    dateFormat: "日期格式",
    dateFormatDesc: "指定日期显示格式。格式应为 moment.js 格式。详见 <a href=https://momentjs.com/docs/#/displaying/format/>moment.js 文档</a>。",
    sortBy: "排序方式",
    sortByDesc: "指定任务项在某个日期内的排序方式。",
    convertTimePrefix: "转换时间前缀",
    convertTimePrefixDesc: "将 24 小时制时间前缀转换为 12 小时制（带 am/pm）。\n例如，任务开头的 15:30 将变为 3:30 pm。\n此操作在排序之后执行，以保持时间顺序。",
    useTemplater: "使用 Templater 插件",
    useTemplaterDesc: "创建新任务文件时使用 Templater 插件通过模板创建文件。",
    templaterTemplateFile: "Templater 模板文件",
    templaterTemplateFileDesc: "选择创建新任务文件时使用的模板文件。",
    useIncludeTags: "使用包含标签过滤",
    useIncludeTagsDesc: "是否使用标签过滤器来过滤掉没有特定标签的任务。",
    taskIncludeFilters: "任务包含过滤",
    taskIncludeFiltersDesc: "按特定标签过滤任务，只有包含一个或多个这些标签的任务才会显示。",
    fileIncludeTags: "文件包含标签",
    fileIncludeTagsDesc: "按文件标签过滤，只显示包含一个或多个这些标签的文件中的任务。",
    useExcludeTags: "使用排除标签过滤",
    useExcludeTagsDesc: "是否使用标签过滤器来过滤掉具有特定标签的任务。",
    taskExcludeFilters: "任务排除过滤",
    taskExcludeFiltersDesc: "按特定标签排除任务，只有**不包含任何**这些标签的任务才会显示。",
    fileExcludeTags: "文件排除标签",
    fileExcludeTagsDesc: "按文件标签排除，只显示**不包含任何**这些标签的文件中的任务。",
    excludePaths: "排除路径",
    excludePathsDesc: "排除匹配特定路径（文件夹、文件）的任务。\n<p style=color:red;>注意：不需要前缀或末尾的 '/'，除非您要过滤整个仓库。</p>",
    includePaths: "包含路径",
    includePathsDesc: "只包含匹配特定路径（文件夹、文件）的任务。\n<p style=color:red;>注意：不需要前缀或末尾的 '/'，除非您要过滤整个仓库。</p>",
    filterEmpty: "过滤空任务",
    filterEmptyDesc: "是否过滤掉空任务项。如果不过滤，将显示空任务的原始文本。",

    useSpecificTaskFiles: "启用特定任务文件",
    useSpecificTaskFilesDesc: "启用特定任务文件功能。此功能允许您绕过包含/排除路径设置，直接指定特定文件来读取任务。",
    addSpecificTaskFile: "添加特定任务文件",
    specificTaskFileAlias: "别名",
    specificTaskFileAliasDesc: "此任务文件面板的显示名称。",
    specificTaskFilePath: "文件路径",
    specificTaskFilePathDesc: "Markdown 文件的路径。",
    enableSpecificTaskFile: "启用",
    removeSpecificTaskFile: "删除",
    noSpecificTaskFiles: "未配置特定任务文件。",

    language: "语言",
    languageDesc: "选择插件的显示语言。",

    filterOption: "过滤",
    focusOption: "聚焦",
    topOption: "顶部",
    bottomOption: "底部",
    todayOption: "今日",
    noFiltersOption: "无过滤",
    todoFilterOption: "待办",
    overdueFilterOption: "过期",
    unplannedFilterOption: "未计划",

    sortStatusAsc: "状态（升序）",
    sortStatusDesc: "状态（降序）",
    sortTextAsc: "文本（升序）",
    sortTextDesc: "文本（降序）",
    sortStartAsc: "开始时间（升序）",
    sortStartDesc: "开始时间（降序）",
    sortDueAsc: "截止时间（升序）",
    sortDueDesc: "截止时间（降序）",
    sortTagsAsc: "标签（升序）",
    sortTagsDesc: "标签（降序）",

    tagAndColor: "标签和颜色",
    tagAndColorDesc: "在文本框中输入标签文本（包含 #），在颜色选择器中选择颜色。",
    tagSettings: "标签",
    tagSettingsDesc: "在文本框中输入标签文本（包含 #），在颜色选择器中选择颜色。",
    save: "保存",
    cancel: "取消",
    delete: "删除",
    edit: "编辑",
    addPalette: "添加调色板",
    notValidTag: "似乎不是一个有效的标签。",
    colorEmpty: "颜色似乎为空，也许您忘记点击颜色选择器了。",
    tagExists: "标签 {tag} 已存在。",

    tasksTimeline: "任务时间线",
    openTasksTimelineView: "打开任务时间线视图",

    newTask: "新建任务",
    filter: "过滤器",
    enterYourTasks: "在此输入您的任务",
    selectNote: "选择要添加任务的笔记",
    appendNewTask: "将新任务添加到所选笔记",
    focusOnToday: "Focus On Today",
    focusToday: "聚焦今日",
    filterType: "过滤器类型",
    from: "从：",
    to: "至：",
    priorities: "优先级：",
    high: "高",
    medium: "中",
    none: "无",
    low: "低",

    todo: "Todo",
    overdue: "Overdue",
    unplanned: "Unplanned",
    todoTasks: "待办任务",
    overdueTasks: "过期任务",
    unplannedTasks: "未计划任务",

    modifyTask: "修改任务",
    createAt: "创建于",
    startAt: "开始于",
    scheduledTo: "计划于",
    dueAt: "截止于",
    completeAt: "完成于",
    recurrent: "重复",
    priority: "优先级",
    priorityLabel: "优先级",
    noPriority: "无优先级",

    errorParsingTasks: "解析任务项时出错：",
    errorGeneratingTasks: "从文件中生成任务时出错：",
    noSuchFile: "未找到文件：",
    errorOpeningFile: "尝试打开文件时出错：",
    somethingWentWrong: "出现错误：",
    templaterNotFound: "未找到 Templater 插件，请启用 Templater 插件。",
    templaterNoTemplate: "请在插件设置中选择 Templater 模板文件。",
    templateFileNotFound: "未找到模板文件：",
    fileNotCreated: "Templater 未能正确创建文件。",
    templateNotApplied: "模板在多次重试后仍未正确应用。",
    errorCreatingFileTemplater: "使用 Templater 创建文件时出错：",
    errorCreatingFile: "创建文件时出错 ",
    errorWritingTask: "写入新任务时出错 ",
    errorReadingFile: "读取文件时出错 ",

    createNewNote: "创建新笔记",
    createNewNoteConfirm: "是否要创建一个路径为 ",
    createBtn: "创建",
    cancelBtn: "取消",
};

const translations: Record<Language, Translations> = { en, zh };

export function t(lang: Language): Translations {
    return translations[lang] || translations.en;
}

export function formatTagExists(lang: Language, tag: string): string {
    const tr = t(lang);
    return tr.tagExists.replace("{tag}", tag);
}

export function formatNoSuchFile(lang: Language, path: string): string {
    const tr = t(lang);
    return tr.noSuchFile + path;
}

export function formatErrorOpeningFile(lang: Language, err: string): string {
    const tr = t(lang);
    return tr.errorOpeningFile + err;
}

export function formatSomethingWentWrong(lang: Language, err: string): string {
    const tr = t(lang);
    return tr.somethingWentWrong + err;
}

export function formatTemplateFileNotFound(lang: Language, path: string): string {
    const tr = t(lang);
    return tr.templateFileNotFound + path;
}

export function formatErrorCreatingFileTemplater(lang: Language, err: string): string {
    const tr = t(lang);
    return tr.errorCreatingFileTemplater + err;
}

export function formatErrorCreatingFile(lang: Language, path: string, err: string): string {
    const tr = t(lang);
    return tr.errorCreatingFile + path + " for new task: " + err;
}

export function formatErrorWritingTask(lang: Language, path: string, err: string): string {
    const tr = t(lang);
    return tr.errorWritingTask + path + "." + err;
}

export function formatErrorReadingFile(lang: Language, path: string, err: string): string {
    const tr = t(lang);
    return tr.errorReadingFile + path + "." + err;
}

export function formatCreateNewNoteConfirm(lang: Language, path: string): string {
    const tr = t(lang);
    return tr.createNewNoteConfirm + path + "?";
}