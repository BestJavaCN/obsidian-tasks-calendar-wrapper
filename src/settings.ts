import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { TaskRegularExpressions } from "utils/tasks";
import TasksCalendarWrapper from "./main";
import { t, Language, formatTagExists } from "./i18n";

export interface SpecificTaskFile {
    alias: string;
    path: string;
    enabled: boolean;
}

function getSortOptions(lang: Language): Record<string, string> {
    const tr = t(lang);
    return {
        "(t1, t2) => t1.order <= t2.order ? -1 : 1": tr.sortStatusAsc,
        "(t1, t2) => t1.order >= t2.order ? -1 : 1": tr.sortStatusDesc,
        "(t1, t2) => t1.visual.trim() <= t2.visual.trim() ? -1 : 1": tr.sortTextAsc,
        "(t1, t2) => t1.visual.trim() >= t2.visual.trim() ? -1 : 1": tr.sortTextDesc,
        "(t1, t2) => t1.start <= t2.start ? -1 : 1": tr.sortStartAsc,
        "(t1, t2) => t1.start >= t2.start ? -1 : 1": tr.sortStartDesc,
        "(t1, t2) => t1.due <= t2.due ? -1 : 1": tr.sortDueAsc,
        "(t1, t2) => t1.due >= t2.due ? -1 : 1": tr.sortDueDesc,
        "(t1, t2) => t1.tags <= t2.tags ? -1 : 1": tr.sortTagsAsc,
        "(t1, t2) => t1.tags >= t2.tags ? -1 : 1": tr.sortTagsDesc
    };
}
export const defaultUserOptions = {
    /**
	 * Open the view on startup or not
	 */
	openViewOnStartup: false as boolean,
    /**
     * filter empty items out or not, if not, the raw text of empty items will be displayed
     */
    filterEmpty: true as boolean,
    /**
     * Exclude tasks match specific paths (folders, files)
     */
    excludePaths: [] as string[],
    /**
     * filter specific files and tasks only from these files are rendered */
    includePaths: [] as string[],
    /**
     * Use tags filters to filter tasks without specific tags out or not.
     */
    useIncludeTags: false as boolean,
    /**
     * Filter tasks with specific tags, only tasks with one or more of these tags are displayed.
     */
    taskIncludeTags: [] as string[],
    /**
     * Filter tasks in specific files which contains one or more of these tags to be displayed.
     */
    fileIncludeTags: [] as string[],
    /**
     * Use tags filters to filters tasks with specific tags out or not.
     */
    useExcludeTags: false as boolean,
    /**
     * Filter tasks without specific tags, only tasks **without any** if these tags are displayed.
     */
    taskExcludeTags: [] as string[],
    /**
     * Filter tasks in specific files which **does not** contains any of these tags to be displayed.
     */
    fileExcludeTags: [] as string[],
    /**
     * optional options to customize the look */
    styles: ['style1'] as string[],
    /**
     * specify the folder where the daily notes are saved */
    dailyNoteFolder: '' as string,
    /**
     * daily note file format */
    dailyNoteFormat: 'YYYY, MMMM DD - dddd' as string,
    /**
     * Only load daily notes within this period (in days).
     * 0 = unlimited, N = only load daily notes dated within the last N days. */
    dailyNotePeriod: 0 as number,
    /**
     * specify under which section the new task items should be appended.  */
    sectionForNewTasks: "## Tasks" as string,
    /**
     * specify which tags are not necessary to display with a tag badge,
     * note that all tag texts are remove from the displayed item text by default. */
    hideTags: [] as string[],
    /**
     * Forward tasks from the past and display them on the today panel or not
     */
    forward: true as boolean,
    /**
     * Specify how do you like the task item to be sorted, it must be a valid lambda
     */
    sort: "(t1, t2) => t1.order <= t2.order ? -1 : 1" as string,
    /**
     * Specify task status order
     * TODO
     */
    taskStatusOrder: ["overdue", "due", "scheduled", "start", "process", "unplanned", "done", "cancelled"],
    /**
     * Specify in what format do you like the dates to be displayed.
     */
    dateFormat: "dddd, MMM, D" as string,
    /**
     * Specify in which file do you like to append new task items to by default.
     * Tasks from this file will be displayed under today panel and labeled inbox by default.
     */
    inbox: "Inbox.md" as string,
    /**
     * Specify which files do you like to be displayed in the file select by default.
     * If left blank, all files where there are task items will be displayed. 
     */
    taskFiles: [] as string[],
    /**
     * Specify a color palette for tags.
     * Note that this will override other color setting for tags.
     */
    tagColorPalette: { "#TODO": "#339988", "#TEST": "#998877" } as any,
    /**
     * Use counters on the today panel or not
     */
    useCounters: true as boolean,
    /**
     * Default behavior for filter buttons,
     * Focus to make items more clear or
     * Filter others out.
     */
    counterBehavior: "Filter" as "Filter" | "Focus",
    /**
     * Use quick entry panel on the today panel or not
     */

    useQuickEntry: true as boolean,
    /**
     * Where to put the entry panel,
     * Top means on top of the view,
     * Bottom means on bottom of the view,
     * Today means in today's view.
     */
    entryPosition: "today" as "today" | "top" | "bottom",
    /**
     * Display which year it is or not.
     */
    useYearHeader: true as boolean,

    /**
     * USE INFO BEGIN
     */
    /**
    * Use relative dates to describe the task dates or not.
    */
    useRelative: true as boolean,
    /**
     * Display recurrence information of tasks or not.
     */
    useRecurrence: true as boolean,
    /**
     * Display priority information of tasks or not.
     */
    usePriority: true as boolean,
    /**
     * Display tags of tasks or not.
     */
    useTags: true as boolean,
    /**
     * Display which file the task is from or not.
     */
    useFileBadge: true as boolean,
    /** 
     * Display which section the task is from or not.
     */
    useSection: true as boolean,
    /**
     * USE INFO END
     */
    /**
     * hide specific status of tasks.
     */
    hideStatusTasks: ['x', '-'] as string[],
    /**
     * Activate today focus on load or not.
     */
    defaultTodayFocus: false as boolean,
    /**
     * Activate a filter or not.
     */
    defaultFilters: "" as string,
    /**
     * Use builtin style (status icons) or not.
     * If disabled, icons defined by the theme will be used.
     */
    useBuiltinStyle: true as boolean,
    /**
     * Convert a 24 hour time prefix in task description (15:30) to 12 hour time with am/pm (3:30 pm)
     */
	convert24HourTimePrefix: false as boolean,
	/**
	 * Use Templater plugin to create files with templates
	 */
	useTemplater: false as boolean,
	/**
	 * Templater template file path to use when creating new files
	 */
	templaterTemplateFile: '' as string,
	/**
	 * Display language: "en" for English, "zh" for Chinese
	 */
	language: "en" as Language,
	/**
	 * Use specific task files feature
	 */
	useSpecificTaskFiles: false as boolean,
	/**
	 * Specific task files list
	 */
	specificTaskFiles: [] as SpecificTaskFile[],
	/**
	 * Internal: canonical STF alias→file-paths mapping used by the UI.
	 * Not persisted to disk; computed at runtime.
	 */
	stfFileMap: {} as Record<string, string[]>,
};
export type UserOption = typeof defaultUserOptions;

export class TasksCalendarSettingTab extends PluginSettingTab {
    plugin: TasksCalendarWrapper;
    constructor(app: App, plugin: TasksCalendarWrapper) {
        super(app, plugin);
        this.plugin = plugin;
        this.onOptionUpdate = this.onOptionUpdate.bind(this);
        this.tagsSettingItem = this.tagsSettingItem.bind(this);
    }

    private static createFragmentWithHTML = (html: string) =>
        createFragment((documentFragment) => (documentFragment.createDiv().innerHTML = html));

    async onOptionUpdate(updatePart: Partial<UserOption>, refreashSettingPage = false) {
        await this.plugin.writeOptions(updatePart);
        if (refreashSettingPage) {
            this.display();
        }
    }

    async display() {
        const { containerEl } = this;
        const lang = this.plugin.userOptions.language;
        const tr = t(lang);

        containerEl.empty();

        containerEl.createEl("h1", { text: tr.timelineSettings });
        containerEl.createEl("h2", { text: tr.uiSettings });

        new Setting(containerEl)
			.setName(tr.openViewOnStartup)
			.setDesc(tr.openViewOnStartupDesc)
			.addToggle(async (tg) => {
				tg.setValue(this.plugin.userOptions.openViewOnStartup);
				tg.onChange(
					async (v) =>
						await this.onOptionUpdate({ openViewOnStartup: v })
				);
			});

        new Setting(containerEl)
            .setName(tr.useBuiltinStyle)
            .setDesc(tr.useBuiltinStyleDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.useBuiltinStyle);
                tg.onChange(async v => await this.onOptionUpdate({ useBuiltinStyle: v }));
            })

        new Setting(containerEl)
            .setName(tr.enableCounters)
            .setDesc(tr.enableCountersDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.useCounters);
                tg.onChange(async v => await this.onOptionUpdate({ useCounters: v }));
            })
        new Setting(containerEl)
            .setName(tr.countersBehavior)
            .setDesc(tr.countersBehaviorDesc)
            .addDropdown(async d => {
                d.addOptions(
                    {
                        "Filter": tr.filterOption,
                        "Focus": tr.focusOption
                    }
                );
                d.setValue(this.plugin.userOptions.counterBehavior);
                d.onChange(async v => await this.onOptionUpdate({ counterBehavior: v as typeof this.plugin.userOptions.counterBehavior }));
            })

        new Setting(containerEl)
            .setName(tr.enableQuickEntry)
            .setDesc(tr.enableQuickEntryDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.useQuickEntry);
                tg.onChange(async v => await this.onOptionUpdate({ useQuickEntry: v }, true));
            })

        new Setting(containerEl)
            .setName(tr.quickEntryPosition)
            .setDesc(tr.quickEntryPositionDesc)
            .addDropdown(async d => {
                d.addOptions({
                    "today": tr.todayOption,
                    "top": tr.topOption,
                    "bottom": tr.bottomOption
                });
                d.setValue(this.plugin.userOptions.entryPosition);
                d.onChange(async v => await this.onOptionUpdate({ entryPosition: v as "today" | "top" | "bottom" }));
            })

        if (this.plugin.userOptions.useQuickEntry) {
            new Setting(containerEl)
                .setName(tr.tasksFiles)
                .setDesc(tr.tasksFilesDesc)
                .addTextArea(ta => {
                    ta.setPlaceholder("comma separated file paths, e.g.: path1,path2");
                    ta.setValue(this.plugin.userOptions.taskFiles.join(","));
                    ta.onChange(async v => {
                        const values = v.split(',');
                        const valuesTrimed = values.map(p => p.trim());
                        await this.onOptionUpdate({ taskFiles: valuesTrimed });
                    })
                })
            new Setting(containerEl)
                .setName(tr.inbox)
                .setDesc(tr.inboxDesc)
                .addText(t => {
                    t.setValue(this.plugin.userOptions.inbox);
                    t.onChange(async v => await this.onOptionUpdate({ inbox: v.trim() }));
                })

            new Setting(containerEl)
                .setName(tr.sectionForNewTasks)
                .setDesc(tr.sectionForNewTasksDesc)
                .addText(t => {
                    t.setValue(this.plugin.userOptions.sectionForNewTasks);
                    t.onChange(async v => await this.onOptionUpdate({ sectionForNewTasks: v }));
                })
        }

        new Setting(containerEl)
            .setName(tr.dailyNoteFolder)
            .setDesc(tr.dailyNoteFolderDesc)
            .addText(t => {
                t.setValue(this.plugin.userOptions.dailyNoteFolder);
                t.onChange(async v => await this.onOptionUpdate({ dailyNoteFolder: v }));
            })

        new Setting(containerEl)
            .setName(tr.dailyNoteFormat)
            .setDesc(
                TasksCalendarSettingTab.createFragmentWithHTML(
                    tr.dailyNoteFormatDesc))
            .addMomentFormat(m => {
                m.setValue(this.plugin.userOptions.dailyNoteFormat);
                m.onChange(async v => await this.onOptionUpdate({ dailyNoteFormat: v }));
            })

        new Setting(containerEl)
            .setName(tr.dailyNotePeriod)
            .setDesc(tr.dailyNotePeriodDesc)
            .addDropdown(d => {
                d.addOptions({
                    "0": tr.dailyNotePeriodUnlimited,
                    "30": tr.dailyNotePeriod30,
                    "90": tr.dailyNotePeriod90,
                    "180": tr.dailyNotePeriod180,
                    "360": tr.dailyNotePeriod360,
                })
                d.setValue(this.plugin.userOptions.dailyNotePeriod.toString());
                d.onChange(async v => await this.onOptionUpdate({ dailyNotePeriod: parseInt(v) }));
            })

        new Setting(containerEl)
            .setName(tr.enableYearHeader)
            .setDesc(tr.enableYearHeaderDesc)
            .addToggle(tg => {
                tg.setValue(this.plugin.userOptions.useYearHeader);
                tg.onChange(async v => await this.onOptionUpdate({ useYearHeader: v }));
            })

        new Setting(containerEl)
            .setName(tr.hideStatusTasks)
            .setDesc(tr.hideStatusTasksDesc)
            .addText(async t => {
                t.setPlaceholder("Status markers split by comma. e.g.,: x, -.");
                t.setValue(this.plugin.userOptions.hideStatusTasks.join(','));
                t.onChange(async v => await this.onOptionUpdate({
                    hideStatusTasks: v.split(',').map(s => s === "[ ]" ? " " : s.trim())
                }))
            });

        new Setting(containerEl)
            .setName(tr.forwardTasks)
            .setDesc(tr.forwardTasksDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.forward);
                tg.onChange(async v => await this.onOptionUpdate({ forward: v }));
            })

        new Setting(containerEl)
            .setName(tr.todayFocusOnLoad)
            .setDesc(tr.todayFocusOnLoadDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.defaultTodayFocus);
                tg.onChange(async v => await this.onOptionUpdate({ defaultTodayFocus: v }));
            })
        new Setting(containerEl)
            .setName(tr.activateFilterOnLoad)
            .setDesc(tr.activateFilterOnLoadDesc)
            .addDropdown(async dd => {
                dd.addOptions({
                    "": tr.noFiltersOption,
                    "todoFilter": tr.todoFilterOption,
                    "overdueFilter": tr.overdueFilterOption,
                    "unplannedFilter": tr.unplannedFilterOption,
                });
                dd.setValue(this.plugin.userOptions.defaultFilters);
                dd.onChange(async v => await this.onOptionUpdate({ defaultFilters: v }));
            })


        containerEl.createEl("h2", { text: tr.taskItemVisualizationSettings });

        new Setting(containerEl)
            .setName(tr.useRelative)
            .setDesc(tr.useRelativeDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.useRelative);
                tg.onChange(async v => await this.onOptionUpdate({ useRelative: v }));
            })
        new Setting(containerEl)
            .setName(tr.useRecurrence)
            .setDesc(tr.useRecurrenceDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.useRecurrence);
                tg.onChange(async v => await this.onOptionUpdate({ useRecurrence: v }));
            })
        new Setting(containerEl)
            .setName(tr.usePriority)
            .setDesc(tr.usePriorityDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.usePriority);
                tg.onChange(async v => await this.onOptionUpdate({ usePriority: v }));
            })

        const tagSettings = new Setting(containerEl);
        tagSettings.controlEl.empty();
        tagSettings.controlEl.appendChild(createEl('div'));
        let tagBadgeSetting = new Setting(tagSettings.controlEl.firstChild as HTMLElement);
        if (this.plugin.userOptions.useTags) {
            Object.entries(this.plugin.userOptions.tagColorPalette).forEach(([tag, color], index) => {
                if (index !== 0 && !(index & 0x01))
                    tagBadgeSetting = new Setting(tagSettings.controlEl.firstChild as HTMLElement);
                tagBadgeSetting.controlEl.appendChild(createEl('div', { cls: "tag", text: `${tag}`, attr: { style: `color: ${color}` } }));
                tagBadgeSetting
                    .addExtraButton(async btn => {
                        btn.setIcon("cross")
                            .setTooltip(tr.delete)
                            .onClick(async () => {
                                delete this.plugin.userOptions.tagColorPalette[tag]

                                await this.onOptionUpdate({}, true);
                            })

                    })
                    .addExtraButton(async btn => {
                        btn.setIcon("pencil")
                            .setTooltip(tr.edit)
                            .onClick(async () => {
                                const modal = new TagColorPaletteModal(this.plugin, lang, tag, color as string);
                                modal.onClose = async () => {
                                    if (!modal.valid) return;
                                    delete this.plugin.userOptions.tagColorPalette[tag];
                                    this.plugin.userOptions.tagColorPalette[modal.tagText] = modal.color;

                                    await this.onOptionUpdate({}, true);
                                }
                                modal.open();
                            })
                    })
            })

            tagSettings
                .addExtraButton(async btn => {
                    btn.setIcon("plus-with-circle")
                        .setTooltip(tr.addPalette)
                        .onClick(async () => {
                            const modal = new TagColorPaletteModal(this.plugin, lang)
                            modal.onClose = async () => {
                                if (!modal.valid) return;
                                this.plugin.userOptions.tagColorPalette[modal.tagText] = modal.color;

                                await this.onOptionUpdate({}, true);
                            }
                            modal.open();
                        })
                })
        }

        tagSettings
            .setName(tr.useTags)
            .setDesc(tr.useTagsDesc)
            .addToggle(tg => {
                tg.setValue(this.plugin.userOptions.useTags);
                tg.onChange(async v => {
                    await this.onOptionUpdate({ useTags: v }, true)
                });
            })


        this.tagsSettingItem(containerEl, tr.hideTags,
            tr.hideTagsDesc,
            this.plugin.userOptions.hideTags,
            (t: string) => {
                return async () => {
                    this.plugin.userOptions.hideTags.remove(t);
                    await this.onOptionUpdate({}, true);
                }
            },
            async (t: string) => {
                if (this.plugin.userOptions.hideTags.includes(t)) {
                    new Notice(formatTagExists(lang, t), 5000);
                } else {
                    this.plugin.userOptions.hideTags.push(t);
                    await this.onOptionUpdate({}, true);
                }
            })

        new Setting(containerEl)
            .setName(tr.useFilename)
            .setDesc(tr.useFilenameDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.useFileBadge);
                tg.onChange(async v => this.onOptionUpdate({ useFileBadge: v }));
            })
        new Setting(containerEl)
            .setName(tr.useSection)
            .setDesc(tr.useSectionDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.useSection);
                tg.onChange(async v => await this.onOptionUpdate({ useSection: v }));
            })

        containerEl.createEl("h2", { text: tr.otherSettings })
        new Setting(containerEl)
            .setName(tr.dateFormat)
            .setDesc(TasksCalendarSettingTab.createFragmentWithHTML(
                tr.dateFormatDesc
            ))
            .addMomentFormat(async m => {
                m.setPlaceholder("e.g.: YYYY-MM-DD");
                m.setValue(this.plugin.userOptions.dateFormat);
                m.onChange(async v => await this.onOptionUpdate({ dateFormat: v }));
            })

        new Setting(containerEl)
            .setName(tr.sortBy)
            .setDesc(TasksCalendarSettingTab.createFragmentWithHTML(
                tr.sortByDesc))
            .addDropdown(async ta => {
                ta.addOptions(getSortOptions(lang));
                ta.setValue(this.plugin.userOptions.sort);
                ta.onChange(async v => {
                    await this.onOptionUpdate({ sort: v });
                })
            })

        new Setting(containerEl)
            .setName(tr.convertTimePrefix)
            .setDesc(tr.convertTimePrefixDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.convert24HourTimePrefix);
                tg.onChange(async v => await this.onOptionUpdate({ convert24HourTimePrefix: v }));
            })

        new Setting(containerEl)
            .setName(tr.useTemplater)
            .setDesc(tr.useTemplaterDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.useTemplater);
                tg.onChange(async v => await this.onOptionUpdate({ useTemplater: v }, true));
            })

        if (this.plugin.userOptions.useTemplater) {
            new Setting(containerEl)
                .setName(tr.templaterTemplateFile)
                .setDesc(tr.templaterTemplateFileDesc)
                .addText(t => {
                    t.setValue(this.plugin.userOptions.templaterTemplateFile);
                    t.setPlaceholder("Path to template file, e.g., templates/task.md");
                    t.onChange(async v => await this.onOptionUpdate({ templaterTemplateFile: v.trim() }));
                })
        }

        new Setting(containerEl)
            .setName(tr.useIncludeTags)
            .setDesc(tr.useIncludeTagsDesc)
            .addToggle(tg => {
                tg
                    .setValue(this.plugin.userOptions.useIncludeTags)
                    .onChange(async v => await this.onOptionUpdate({ useIncludeTags: v }, true));
            });

        if (this.plugin.userOptions.useIncludeTags) {
            this.tagsSettingItem(containerEl, tr.taskIncludeFilters,
                tr.taskIncludeFiltersDesc,
                this.plugin.userOptions.taskIncludeTags,
                (t: string) => {
                    return async () => {
                        this.plugin.userOptions.taskIncludeTags.remove(t);
                        await this.onOptionUpdate({}, true);
                    }
                },
                async (t: string) => {
                    if (this.plugin.userOptions.taskIncludeTags.contains(t)) {
                        new Notice(formatTagExists(lang, t), 5000);
                    } else {
                        this.plugin.userOptions.taskIncludeTags.push(t);
                        await this.onOptionUpdate({}, true);
                    }
                });

            this.tagsSettingItem(containerEl, tr.fileIncludeTags,
                tr.fileIncludeTagsDesc,
                this.plugin.userOptions.fileIncludeTags,
                (t: string) => {
                    return async () => {
                        this.plugin.userOptions.fileIncludeTags.remove(t);
                        await this.onOptionUpdate({}, true);
                    }
                },
                async (t: string) => {
                    if (this.plugin.userOptions.fileIncludeTags.contains(t)) {
                        new Notice(formatTagExists(lang, t), 5000);
                    } else {
                        this.plugin.userOptions.fileIncludeTags.push(t);
                        await this.onOptionUpdate({}, true);
                    }
                })
        }


        new Setting(containerEl)
            .setName(tr.useExcludeTags)
            .setDesc(tr.useExcludeTagsDesc)
            .addToggle(tg => {
                tg
                    .setValue(this.plugin.userOptions.useExcludeTags)
                    .onChange(async v => await this.onOptionUpdate({ useExcludeTags: v }, true));
            });

        if (this.plugin.userOptions.useExcludeTags) {
            this.tagsSettingItem(containerEl, tr.taskExcludeFilters,
                tr.taskExcludeFiltersDesc,
                this.plugin.userOptions.taskExcludeTags,
                (t: string) => {
                    return async () => {
                        this.plugin.userOptions.taskExcludeTags.remove(t);
                        await this.onOptionUpdate({}, true);
                    }
                },
                async (t: string) => {
                    if (this.plugin.userOptions.taskExcludeTags.contains(t)) {
                        new Notice(formatTagExists(lang, t), 5000);
                    } else {
                        this.plugin.userOptions.taskExcludeTags.push(t);
                        await this.onOptionUpdate({}, true);
                    }
                });

            this.tagsSettingItem(containerEl, tr.fileExcludeTags,
                tr.fileExcludeTagsDesc,
                this.plugin.userOptions.fileExcludeTags,
                (t: string) => {
                    return async () => {
                        this.plugin.userOptions.fileExcludeTags.remove(t);
                        await this.onOptionUpdate({}, true);
                    }
                },
                async (t: string) => {
                    if (this.plugin.userOptions.fileExcludeTags.contains(t)) {
                        new Notice(formatTagExists(lang, t), 5000);
                    } else {
                        this.plugin.userOptions.fileExcludeTags.push(t);
                        await this.onOptionUpdate({}, true);
                    }
                })
        }

        new Setting(containerEl)
            .setName(tr.excludePaths)
            .setDesc(TasksCalendarSettingTab.createFragmentWithHTML(
                tr.excludePathsDesc
            ))
            .addTextArea(ta => {
                ta.setPlaceholder("comma separated file paths, e.g.: path1,path2/path3,path4.md");
                ta.setValue(this.plugin.userOptions.excludePaths.join(","));
                ta.onChange(async v => {
                    const values = v.split(',');
                    const valuesTrimed = values.map(p => p.trim()).filter(p => p.length > 0);
                    await this.onOptionUpdate({ excludePaths: valuesTrimed });
                })
            })

        new Setting(containerEl)
            .setName(tr.includePaths)
            .setDesc(TasksCalendarSettingTab.createFragmentWithHTML(
                tr.includePathsDesc
            ))
            .addTextArea(ta => {
                ta.setPlaceholder("comma separated file paths, e.g.: path1,path2/path3,path4.md");
                ta.setValue(this.plugin.userOptions.includePaths.join(","));
                ta.onChange(async v => {
                    const values = v.split(',');
                    const valuesTrimed = values.map(p => p.trim()).filter(p => p.length > 0);
                    await this.onOptionUpdate({ includePaths: valuesTrimed });
                })
            })

        new Setting(containerEl)
            .setName(tr.filterEmpty)
            .setDesc(tr.filterEmptyDesc)
            .addToggle(to => {
                to.setValue(this.plugin.userOptions.filterEmpty);
                to.onChange(async v => {
                    await this.onOptionUpdate({ filterEmpty: v });
                })
            })

        new Setting(containerEl)
            .setName(tr.language)
            .setDesc(tr.languageDesc)
            .addDropdown(async d => {
                d.addOptions({
                    "en": "English",
                    "zh": "中文"
                });
                d.setValue(this.plugin.userOptions.language);
                d.onChange(async v => {
                    await this.onOptionUpdate({ language: v as Language }, true);
                });
            })

        // Specific Task Files
        containerEl.createEl("h2", { text: tr.useSpecificTaskFiles });

        new Setting(containerEl)
            .setName(tr.useSpecificTaskFiles)
            .setDesc(tr.useSpecificTaskFilesDesc)
            .addToggle(async tg => {
                tg.setValue(this.plugin.userOptions.useSpecificTaskFiles);
                tg.onChange(async v => {
                    await this.onOptionUpdate({ useSpecificTaskFiles: v }, true);
                });
            });

        if (this.plugin.userOptions.useSpecificTaskFiles) {
            const specificTaskFilesDiv = containerEl.createDiv();
            this.renderSpecificTaskFiles(specificTaskFilesDiv);
        }
    }

    private renderSpecificTaskFiles(containerEl: HTMLElement) {
        const tr = t(this.plugin.userOptions.language);
        const specificTaskFiles = this.plugin.userOptions.specificTaskFiles;

        specificTaskFiles.forEach((stf, index) => {
            const itemDiv = containerEl.createDiv({ cls: "specific-task-file-item" });
            itemDiv.style.border = "1px solid var(--background-modifier-border)";
            itemDiv.style.borderRadius = "8px";
            itemDiv.style.padding = "10px";
            itemDiv.style.marginBottom = "10px";

            new Setting(itemDiv)
                .setName(tr.specificTaskFileAlias)
                .setDesc(tr.specificTaskFileAliasDesc)
                .addText(t => {
                    t.setValue(stf.alias);
                    t.onChange(async v => {
                        this.plugin.userOptions.specificTaskFiles[index].alias = v;
                        await this.onOptionUpdate({}, false);
                    });
                });

            new Setting(itemDiv)
                .setName(tr.specificTaskFilePath)
                .setDesc(tr.specificTaskFilePathDesc)
                .addText(t => {
                    t.setValue(stf.path);
                    t.onChange(async v => {
                        this.plugin.userOptions.specificTaskFiles[index].path = v.trim();
                        await this.onOptionUpdate({}, false);
                    });
                    // Validate path existence
                    if (stf.path && !this.plugin.app.vault.getAbstractFileByPath(stf.path)) {
                        t.inputEl.style.borderColor = "var(--text-error)";
                        t.inputEl.title = stf.path
                            ? `File not found: ${stf.path}`
                            : "";
                    }
                });

            new Setting(itemDiv)
                .setName(tr.enableSpecificTaskFile)
                .addToggle(tg => {
                    tg.setValue(stf.enabled);
                    tg.onChange(async v => {
                        this.plugin.userOptions.specificTaskFiles[index].enabled = v;
                        await this.onOptionUpdate({}, false);
                    });
                })
                .addExtraButton(btn => {
                    btn.setIcon("trash")
                        .setTooltip(tr.removeSpecificTaskFile)
                        .onClick(async () => {
                            this.plugin.userOptions.specificTaskFiles.splice(index, 1);
                            await this.onOptionUpdate({}, true);
                        });
                });
        });

        new Setting(containerEl)
            .addButton(btn => {
                btn.setIcon("plus-with-circle")
                    .setButtonText(tr.addSpecificTaskFile)
                    .onClick(async () => {
                        this.plugin.userOptions.specificTaskFiles.push({
                            alias: "",
                            path: "",
                            enabled: false,
                        });
                        await this.onOptionUpdate({}, true);
                    });
            });

        if (specificTaskFiles.length === 0) {
            containerEl.createEl("p", { text: tr.noSpecificTaskFiles, cls: "setting-item-description" });
        }
    }

    private tagsSettingItem = (
        container: HTMLElement,
        name: string,
        desc: string,
        tags: string[],
        ondelete: (t: string) => (() => Promise<void>),
        onadd: (t: string) => Promise<void>,
    ) => {
        const tagsSetting = new Setting(container)
            .setName(name)
            .setDesc(desc)
        tagsSetting.controlEl.empty();
        tagsSetting.controlEl.appendChild(createDiv());
        let tagsSettingControlEl = new Setting(tagsSetting.controlEl.firstChild as HTMLElement);
        tags.forEach((tagText, i) => {
            if (i !== 0 && i % 3 === 0) tagsSettingControlEl = new Setting(tagsSetting.controlEl.firstChild as HTMLElement);
            tagsSettingControlEl.controlEl.appendChild(createEl('div', { cls: "tag", text: tagText }));
            tagsSettingControlEl.addExtraButton(eb => {
                eb
                    .setIcon("cross")
                    .setTooltip(t(this.plugin.userOptions.language).delete)
                    .onClick(ondelete(tagText));
            })
        })

        tagsSetting.addExtraButton(eb => {
            eb.setIcon("plus-with-circle");
            eb.onClick(() => {
                const modal = new TagModal(this.plugin, this.plugin.userOptions.language);
                modal.onClose = async () => {
                    if (!modal.valid) return;
                    await onadd(modal.tagText);
                };
                modal.open();
            })
        })
    }
}


class TagColorPaletteModal extends Modal {
    tagText: string;
    color: string;
    valid: boolean;
    private lang: Language;
    constructor(plugin: Plugin, lang: Language, tag?: string, color?: string) {
        super(plugin.app);
        this.tagText = tag || "";
        this.color = color || "";
        this.valid = false;
        this.lang = lang;
    }
    onOpen(): void {
        this.display();
    }
    display() {
        const { contentEl } = this;
        const tr = t(this.lang);
        contentEl.empty();
        const settingdiv = contentEl.createDiv();
        new Setting(settingdiv)
            .setName(tr.tagAndColor)
            .setDesc(tr.tagAndColorDesc)
            .addText(t => {
                t.setValue(this.tagText);
                t.onChange(v => this.tagText = v);
            })
            .addColorPicker(cp => {
                cp.setValue(this.color);
                cp.onChange(v => this.color = v);
            })
        const footer = contentEl.createDiv();
        new Setting(footer)
            .addButton(btn => {
                btn.setIcon("checkmark");
                btn.setTooltip(tr.save);
                btn.onClick(() => {
                    if (!this.tagText.match(TaskRegularExpressions.hashTags)) {
                        this.valid = false;
                        return new Notice(`${this.tagText} ${tr.notValidTag}`, 5000)
                    }
                    if (this.color === "") {
                        this.valid = false;
                        return new Notice(tr.colorEmpty, 5000);
                    }
                    this.valid = true;
                    this.close();
                });
                return btn;
            })
            .addButton(btn => {
                btn.setIcon("cross");
                btn.setTooltip(tr.cancel);
                btn.onClick(() => {
                    this.valid = false;
                    this.close();
                });
                return btn;
            })
    }
}

class TagModal extends Modal {
    tagText: string;
    valid: boolean;
    private lang: Language;
    constructor(plugin: Plugin, lang: Language) {
        super(plugin.app);
        this.tagText = "";
        this.valid = false;
        this.lang = lang;
    }
    onOpen(): void {
        this.display();
    }
    display() {
        const { contentEl } = this;
        const tr = t(this.lang);
        contentEl.empty();
        const settingdiv = contentEl.createDiv();
        new Setting(settingdiv)
            .setName(tr.tagSettings)
            .setDesc(tr.tagSettingsDesc)
            .addText(t => {
                t.setValue(this.tagText);
                t.onChange(v => {
                    this.tagText = v
                });
                return t;
            })
        const footer = contentEl.createDiv();
        new Setting(footer)
            .addButton(btn => {
                btn.setIcon("checkmark");
                btn.setTooltip(tr.save);
                btn.onClick(() => {
                    if (!this.tagText.match(TaskRegularExpressions.hashTags)) {
                        this.valid = false;
                        new Notice(`${this.tagText} ${tr.notValidTag}`, 5000)
                    } else {
                        this.valid = true;
                    }
                    this.close();
                });
                return btn;
            })
            .addButton(btn => {
                btn.setIcon("cross");
                btn.setTooltip(tr.cancel);
                btn.onClick(() => {
                    this.valid = false;
                    this.close();
                });
                return btn;
            })
    }
}
