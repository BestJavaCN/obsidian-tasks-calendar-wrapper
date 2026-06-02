import { Model } from 'backbone';
import moment from 'moment';
import { App, ItemView, Modal, Notice, Pos } from 'obsidian';
import * as React from 'react';
import { UserOption, defaultUserOptions } from '../../src/settings';
import * as TaskMapable from '../../utils/taskmapable';
import { TaskDataModel } from '../../utils/tasks';
import { QuickEntryHandlerContext, TaskItemEventHandlersContext } from './components/context';
import { TimelineView } from './components/timelineview';

class CreateFileModal extends Modal {
    private path: string;
    private section: string;
    private taskStr: string;
    private onConfirm: () => void;
    private onCancel: () => void;

    constructor(app: App, path: string, section: string, taskStr: string, onConfirm: () => void, onCancel: () => void) {
        super(app);
        this.path = path;
        this.section = section;
        this.taskStr = taskStr;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '创建新笔记' });
        contentEl.createEl('p', { text: `是否要创建一个路径为 ${this.path} 的笔记。` });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        buttonContainer.createEl('button', {
            text: '创建',
            cls: 'mod-cta'
        }).addEventListener('click', () => {
            this.close();
            this.onConfirm();
        });

        buttonContainer.createEl('button', {
            text: '取消',
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
    taskListModel: new Model({ taskList: [] as TaskDataModel[] }) as Model,
}
const defaultObsidianBridgeState = {
    taskList: [] as TaskDataModel[],
    userOptions: defaultUserOptions as UserOption,
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
        this.app.vault.adapter.exists(path).then(exist => {
            if (!exist) {
                new CreateFileModal(
                    this.app,
                    path,
                    section,
                    taskStr,
                    async () => {
                        if (useTemplater) {
                            const templater = this.getTemplater();
                            if (!templater) {
                                new Notice("Templater plugin not found. Please enable Templater plugin.", 5000);
                                return;
                            }

                            const templateFilePath = this.state.userOptions.templaterTemplateFile;
                            if (!templateFilePath) {
                                new Notice("Please select a Templater template file in the plugin settings.", 5000);
                                return;
                            }

                            const templateFile = this.app.vault.getAbstractFileByPath(templateFilePath);
                            if (!templateFile) {
                                new Notice("Template file not found: " + templateFilePath, 5000);
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

                                // Verify file was created and template was applied
                                const file = this.app.vault.getAbstractFileByPath(path);
                                if (!file) {
                                    new Notice("File was not created properly by Templater.", 5000);
                                    return;
                                }

                                // Verify template was applied with retry mechanism
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
                                    new Notice("Template was not applied properly after multiple retries.", 5000);
                                    return;
                                }

                                // Add task to the file
                                await this.addTaskToFile(path, section, taskStr);

                                // Open the file
                                this.app.workspace.openLinkText('', path);

                            } catch (reason) {
                                new Notice("Error when creating file with Templater: " + reason, 5000);
                            }
                        } else {
                            // Original behavior: create file with section and task
                            const content = section + "\n" + taskStr;
                            this.app.vault.create(path, content)
                                .then(() => {
                                    this.onUpdateTasks();
                                    // Open the newly created file
                                    this.app.workspace.openLinkText('', path);
                                })
                                .catch(reason => {
                                    return new Notice("Error when creating file " + path + " for new task: " + reason, 5000);
                                });
                        }
                    },
                    () => {
                        // User cancelled, do nothing
                    }
                ).open();
                return;
            }
            // File exists, add task to existing file
            this.app.vault.adapter.read(path).then(content => {
                const lines = content.split('\n');
                lines.splice(lines.indexOf(section) + 1, 0, taskStr);
                this.app.vault.adapter.write(path, lines.join("\n"))
                    .then(() => {
                        this.onUpdateTasks();
                        // Open the file after adding the task
                        this.app.workspace.openLinkText('', path);
                    })
                    .catch(reason => {
                        return new Notice("Error when writing new tasks to " + path + "." + reason, 5000);
                    });
            }).catch(reason => new Notice("Error when reading file " + path + "." + reason, 5000));
        })
    }


    handleTagClick(tag: string) {
        //@ts-ignore
        const searchPlugin = this.app.internalPlugins.getPluginById("global-search");
        const search = searchPlugin && searchPlugin.instance;
        search.openGlobalSearch('tag:' + tag)
    }

    handleOpenFile(path: string, position: Pos, openTaskEdit = false) {
        this.app.vault.adapter.exists(path).then(exist => {
            if (!exist) {
                new Notice("No such file: " + path, 5000);
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
                    new Notice("Error when trying open file: " + err, 5000);
                }
            })
        }).catch(reason => {
            new Notice("Something went wrong: " + reason, 5000);
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
            }
        })
    }

    render(): React.ReactNode {
        console.debug("Now the root node are rendering with: ", this.state.taskList)
        console.debug("Now the root node are reddering with: ", this.state.userOptions)
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
                    <TimelineView userOptions={this.state.userOptions} taskList={this.state.taskList} />
                </TaskItemEventHandlersContext.Provider>
            </QuickEntryHandlerContext.Provider>
        )
    }
}