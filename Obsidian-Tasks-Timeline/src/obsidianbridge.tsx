import { Model } from 'backbone';
import moment from 'moment';
import { App, ItemView, Modal, Notice, Pos } from 'obsidian';
import * as React from 'react';
import { UserOption, defaultUserOptions } from '../../src/settings';
import { t, Language, formatNoSuchFile, formatErrorOpeningFile, formatSomethingWentWrong, formatTemplateFileNotFound, formatErrorCreatingFileTemplater, formatErrorCreatingFile, formatErrorWritingTask, formatErrorReadingFile } from '../../src/i18n';
import * as TaskMapable from '../../utils/taskmapable';
import { TaskDataModel, TaskRegularExpressions } from '../../utils/tasks';
import { QuickEntryHandlerContext, TaskItemEventHandlersContext } from './components/context';
import { TimelineView } from './components/timelineview';

class CreateFileModal extends Modal {
    private path: string;
    private section: string;
    private taskStr: string;
    private onConfirm: () => void;
    private onCancel: () => void;
    private lang: Language;

    constructor(app: App, lang: Language, path: string, section: string, taskStr: string, onConfirm: () => void, onCancel: () => void) {
        super(app);
        this.path = path;
        this.section = section;
        this.taskStr = taskStr;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.lang = lang;
    }

    onOpen() {
        const { contentEl } = this;
        const tr = t(this.lang);
        contentEl.createEl('h2', { text: tr.createNewNote });
        contentEl.createEl('p', { text: `${tr.createNewNoteConfirm} ${this.path} ?` });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        buttonContainer.createEl('button', {
            text: tr.createBtn,
            cls: 'mod-cta'
        }).addEventListener('click', () => {
            this.close();
            this.onConfirm();
        });

        buttonContainer.createEl('button', {
            text: tr.cancelBtn,
            cls: 'mod-cta',
            attr: { style: 'margin-left: 8px;' }
        }).addEventListener('click', () => {
            this.close();
            this.onCancel();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

const defaultObsidianBridgeProps = {
    plugin: {} as ItemView,
    userOptionModel: new Model({ ...defaultUserOptions }) as Model,
    taskListModel: new Model({ taskList: [] as TaskDataModel[], specificTaskFileData: [] as Array<{ alias: string; tasks: TaskDataModel[] }> }) as Model,
}
const defaultObsidianBridgeState = {
    taskList: [] as TaskDataModel[],
    userOptions: defaultUserOptions as UserOption,
    specificTaskFileData: [] as Array<{ alias: string; tasks: TaskDataModel[] }>,
}
type ObsidianBridgeProps = Readonly<typeof defaultObsidianBridgeProps>;
type ObsidianBridgeState = typeof defaultObsidianBridgeState;
export class ObsidianBridge extends React.Component<ObsidianBridgeProps, ObsidianBridgeState> {
    //private readonly adapter: ObsidianTaskAdapter;
    private readonly app: App;
    constructor(props: ObsidianBridgeProps) {
        super(props);

        this.app = this.props.plugin.app;

        this.handleCreateNewTask = this.handleCreateNewTask.bind(this);
        this.handleTagClick = this.handleTagClick.bind(this);
        this.handleOpenFile = this.handleOpenFile.bind(this);
        this.handleCompleteTask = this.handleCompleteTask.bind(this);
        this.onUpdateTasks = this.onUpdateTasks.bind(this);
        this.onUpdateUserOption = this.onUpdateUserOption.bind(this);
        this.handleModifyTask = this.handleModifyTask.bind(this);
        this.handleFilterEnable = this.handleFilterEnable.bind(this);

        //this.adapter = new ObsidianTaskAdapter(this.app);

        this.state = {
            userOptions: { ...(this.props.userOptionModel.pick(this.props.userOptionModel.keys()) as UserOption) },
            taskList: this.props.taskListModel.get("taskList"),
            specificTaskFileData: this.props.taskListModel.get("specificTaskFileData") || [],
        }
    }

    componentDidMount(): void {

        this.props.taskListModel.on('change', this.onUpdateTasks)
        this.props.userOptionModel.on('change', this.onUpdateUserOption)
    }

    componentWillUnmount(): void {
        this.props.taskListModel.off('change', this.onUpdateTasks);
        this.props.userOptionModel.off('change', this.onUpdateUserOption);
    }

    onUpdateUserOption() {
        this.setState({
            userOptions: { ...(this.props.userOptionModel.pick(this.props.userOptionModel.keys()) as UserOption) }
        })
    }

    onUpdateTasks() {
        this.setState({
            taskList: this.props.taskListModel.get("taskList"),
            specificTaskFileData: this.props.taskListModel.get("specificTaskFileData") || [],
        })
    }

    handleFilterEnable(startDate: string, endDate: string, priorities: string[]) {

        let taskList: TaskDataModel[] = this.props.taskListModel.get("taskList");

        if (startDate && startDate !== "" && endDate && endDate !== "") {
            taskList = taskList
                .filter(TaskMapable.filterDateRange(moment(startDate), moment(endDate)))
        }
        if (priorities.length !== 0) {
            taskList = taskList.filter((t: TaskDataModel) => priorities.includes(t.priority));
        }
        this.setState({
            taskList: taskList
        });
    }

    private async addTaskToFile(path: string, section: string, taskStr: string): Promise<void> {
        const content = await this.app.vault.adapter.read(path);
        let lines = content.split('\n');
        if (!lines.includes(section)) {
            lines.push(section);
        }
        const sectionIndex = lines.indexOf(section);
        if (sectionIndex !== -1 && !lines.slice(sectionIndex + 1).some(line => line.startsWith("- [ ]"))) {
            lines.splice(sectionIndex + 1, 0, taskStr);
        }
        await this.app.vault.adapter.write(path, lines.join("\n"));
        this.onUpdateTasks();
    }

    private getTemplater() {
        //@ts-ignore
        const templaterPlugin = this.app.plugins.plugins["templater-obsidian"];
        return templaterPlugin?.templater;
    }

    handleCreateNewTask(path: string, append: string) {
        const taskStr = "- [ ] " + append;
        const section = this.state.userOptions.sectionForNewTasks;
        const useTemplater = this.state.userOptions.useTemplater;
        const lang = this.state.userOptions.language;
        this.app.vault.adapter.exists(path).then(exist => {
            if (!exist) {
                new CreateFileModal(
                    this.app,
                    lang,
                    path,
                    section,
                    taskStr,
                    async () => {
                        if (useTemplater) {
                            const templater = this.getTemplater();
                            if (!templater) {
                                new Notice(t(lang).templaterNotFound, 5000);
                                return;
                            }

                            const templateFilePath = this.state.userOptions.templaterTemplateFile;
                            if (!templateFilePath) {
                                new Notice(t(lang).templaterNoTemplate, 5000);
                                return;
                            }

                            const templateFile = this.app.vault.getAbstractFileByPath(templateFilePath);
                            if (!templateFile) {
                                new Notice(formatTemplateFileNotFound(lang, templateFilePath), 5000);
                                return;
                            }

                            const lastSlash = path.lastIndexOf('/');
                            const folder = lastSlash > 0 ? path.substring(0, lastSlash) : '';
                            const filename = path.substring(lastSlash + 1, path.lastIndexOf('.md'));
                            const folderObj = folder ? this.app.vault.getAbstractFileByPath(folder) : null;

                            try {
                                await templater.create_new_note_from_template(
                                    templateFile,
                                    folderObj,
                                    filename,
                                    true
                                );

                                const file = this.app.vault.getAbstractFileByPath(path);
                                if (!file) {
                                    new Notice(t(lang).fileNotCreated, 5000);
                                    return;
                                }

                                let content = '';
                                let attempts = 0;
                                const maxAttempts = 5;
                                while (attempts < maxAttempts) {
                                    content = await this.app.vault.adapter.read(path);
                                    if (content && content.trim().length > 0) {
                                        break;
                                    }
                                    attempts++;
                                    if (attempts < maxAttempts) {
                                        await new Promise(resolve => setTimeout(resolve, 200));
                                    }
                                }
                              
                                if (!content || content.trim().length === 0) {
                                    new Notice(t(lang).templateNotApplied, 5000);
                                    return;
                                }

                                await this.addTaskToFile(path, section, taskStr);

                                this.app.workspace.openLinkText('', path);

                            } catch (reason) {
                                new Notice(formatErrorCreatingFileTemplater(lang, reason), 5000);
                            }
                        } else {
                            const content = section + "\n" + taskStr;
                            this.app.vault.create(path, content)
                                .then(() => {
                                    this.onUpdateTasks();
                                    this.app.workspace.openLinkText('', path);
                                })
                                .catch(reason => {
                                    return new Notice(formatErrorCreatingFile(lang, path, reason), 5000);
                                });
                        }
                    },
                    () => {
                    }
                ).open();
                return;
            }
            this.app.vault.adapter.read(path).then(content => {
                const lines = content.split('\n');
                lines.splice(lines.indexOf(section) + 1, 0, taskStr);
                this.app.vault.adapter.write(path, lines.join("\n"))
                    .then(() => {
                        this.onUpdateTasks();
                        this.app.workspace.openLinkText('', path);
                    })
                    .catch(reason => {
                        return new Notice(formatErrorWritingTask(lang, path, reason), 5000);
                    });
            }).catch(reason => new Notice(formatErrorReadingFile(lang, path, reason), 5000));
        })
    }


    handleTagClick(tag: string) {
        //@ts-ignore
        const searchPlugin = this.app.internalPlugins.getPluginById("global-search");
        const search = searchPlugin && searchPlugin.instance;
        search.openGlobalSearch('tag:' + tag)
    }

    handleOpenFile(path: string, position: Pos, openTaskEdit = false) {
        const lang = this.state.userOptions.language;
        this.app.vault.adapter.exists(path).then(exist => {
            if (!exist) {
                new Notice(formatNoSuchFile(lang, path), 5000);
                return;
            }
            this.app.workspace.openLinkText('', path).then(() => {
                try {
                    const file = this.app.workspace.getActiveFile();
                    file && this.app.workspace.getLeaf().openFile(file, { state: { mode: "source" } });
                    this.app.workspace.activeEditor?.editor?.setSelection(
                        { line: position.start.line, ch: position.start.col },
                        { line: position.start.line, ch: position.end.col }
                    )
                    if (!this.app.workspace.activeEditor?.editor?.hasFocus()) {
                        this.app.workspace.activeEditor?.editor?.focus();
                    }
                    if (openTaskEdit) {
                        const editor = this.app.workspace.activeEditor?.editor;
                        if (editor) {
                            const view = this.app.workspace.getLeaf().view;
                            //@ts-ignore
                            this.app.commands.commands['obsidian-tasks-plugin:edit-task']
                                .editorCheckCallback(false, editor, view);
                        }
                    }
                } catch (err) {
                    new Notice(formatErrorOpeningFile(lang, err), 5000);
                }
            })
        }).catch(reason => {
            new Notice(formatSomethingWentWrong(lang, reason), 5000);
        })
    }

    handleModifyTask(path: string, position: Pos) {
        this.handleOpenFile(path, position, true);
    }

    handleCompleteTask(path: string, position: Pos) {
        this.app.workspace.openLinkText('', path).then(() => {
            const file = this.app.workspace.getActiveFile();
            this.app.workspace.getLeaf().openFile(file!, { state: { mode: "source" } });
            this.app.workspace.activeEditor?.editor?.setSelection(
                { line: position.start.line, ch: position.start.col },
                { line: position.end.line, ch: position.end.col }
            );
            if (!this.app.workspace.activeEditor?.editor?.hasFocus())
                this.app.workspace.activeEditor?.editor?.focus();
            const editor = this.app.workspace.activeEditor?.editor;
            if (editor) {
                const view = this.app.workspace.getLeaf().view;
                //@ts-ignore
                this.app.commands.commands['obsidian-tasks-plugin:toggle-done']
                    .editorCheckCallback(false, editor, view);

                // 乐观更新：toggle-done 已修改编辑器内容（在内存中），
                // 直接从编辑器行中读取新的状态标记，立即更新 model，
                // 无需等待文件落盘和 metadataCache 事件。
                const newLine = editor.getLine(position.start.line);
                const regexMatch = newLine.match(TaskRegularExpressions.taskRegex);
                if (regexMatch) {
                    const newMarker = regexMatch[3];
                    const taskList: TaskDataModel[] = this.props.taskListModel.get("taskList");
                    if (taskList) {
                        const updatedTasks = taskList.map(task => {
                            if (task.path === path && task.position.start.line === position.start.line) {
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
                        this.props.taskListModel.set({ taskList: updatedTasks });
                    }
                }
            }
        })
    }

    render(): React.ReactNode {
        return (
            <QuickEntryHandlerContext.Provider
                value={{
                    handleCreateNewTask: this.handleCreateNewTask,
                    handleFilterEnable: this.handleFilterEnable
                }}>
                <TaskItemEventHandlersContext.Provider value={{
                    handleOpenFile: this.handleOpenFile,
                    handleCompleteTask: this.handleCompleteTask,
                    handleTagClick: this.handleTagClick,
                    // pass an undefined if the obsidian-tasks-plugin not installed
                    //@ts-ignore
                    handleModifyTask: this.app.plugins.plugins['obsidian-tasks-plugin'] === undefined ? undefined : this.handleModifyTask,
                }}>
                    <TimelineView userOptions={this.state.userOptions} taskList={this.state.taskList} specificTaskFileData={this.state.specificTaskFileData} />
                </TaskItemEventHandlersContext.Provider>
            </QuickEntryHandlerContext.Provider>
        )
    }
}