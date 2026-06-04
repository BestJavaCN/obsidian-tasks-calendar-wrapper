import moment, { Moment } from "moment";
import { MarkdownRenderer } from "obsidian";
import * as React from "react";
import { getFileTitle } from "../../../dataview-util/dataview";
import { TasksTimelineView } from "../../../src/views";
import { TaskDataModel, recurrenceSymbol } from "../../../utils/tasks";
import { t } from "../../../src/i18n";
import * as Icons from './asserts/icons';
import { TaskItemEventHandlersContext, UserOptionContext } from "./context";

const getRelative = (someDate: Moment) => {
    if (moment().diff(someDate, 'days') >= 1 || moment().diff(someDate, 'days') <= -1) {
        return someDate.fromNow();
    } else {
        return someDate.calendar().split(' ')[0];
    }
};

const defaultTaskItemProps = {
    taskItem: {} as TaskDataModel
}

type TaskItemProps = Readonly<typeof defaultTaskItemProps>;
const defaultTaskItemState = {
    taskStatus: "task" as string,
}
type TaskItemState = typeof defaultTaskItemState;
export class TaskItemView extends React.Component<TaskItemProps, TaskItemState> {
    constructor(props: TaskItemProps) {
        super(props);
        this.state = {
            taskStatus: "task",
        }
    }

    render(): React.ReactNode {
        const item = this.props.taskItem;
        const display = item.visual || item.text;
        const line = item.line;
        const col = item.position.end.col;
        const link = item.link.path.replace("'", "&apos;");
        const isDailyNote = item.dailyNote;
        const color = item.fontMatter["color"];
        const ariaLabel = getFileTitle(item.path);
        const tags = [...new Set(item.tags)];
        //const outlinks = item.outlinks;

        const path = item.path;
        const position = item.position;
        return (
            <TaskItemEventHandlersContext.Consumer>{
                callbacks => {
                    const openTaskFile = () => {
                        callbacks.handleOpenFile(path, position);
                    };
                    const onToggleTask = () => {
                        callbacks.handleCompleteTask(path, position);
                    };
                    const onModifyTask = () => {
                        callbacks.handleModifyTask(path, position);
                    };
                    return (
                        <UserOptionContext.Consumer>{
                            ({ dateFormat, hideTags, useBuiltinStyle, language, activeSpecificTaskFile }) => {
                                const tr = t((language || "en") as "en" | "zh");
                                return (
                                    <div data-line={line} data-task={item.statusMarker} data-col={col} data-link={link} data-dailynote={isDailyNote}
                                        data-stf-alias={item.stfAlias || ""}
                                        className={`task ${item.status}`}
                                        style={{ "--task-color": color || "var(--text-muted)" } as React.CSSProperties} aria-label={ariaLabel}>
                                        <StripWithIcon onToggle={onToggleTask} useBuiltinStyle={useBuiltinStyle}
                                            marker={item.statusMarker} status={item.status} />
                                        <div className='lines' onClick={openTaskFile}>
                                            <div className="content">
                                                <Content display={display} fileName={item.path} />
                                            </div>
                                            <div className='line info'>
                                                {callbacks.handleModifyTask &&
                                                    <ModifyBadge onClick={onModifyTask} ariaLabel={tr.modifyTask}></ModifyBadge>}
                                                {item.created &&
                                                    <DateStatusBadge
                                                        className='relative' ariaLabel={tr.createAt + " " + item.created.format(dateFormat)}
                                                        label={getRelative(item.created)} icon={Icons.taskIcon} />}
                                                {item.start &&
                                                    <DateStatusBadge
                                                        className='relative' ariaLabel={tr.startAt + " " + item.start.format(dateFormat)}
                                                        label={getRelative(item.start)} icon={Icons.startIcon} />}
                                                {item.scheduled &&
                                                    <DateStatusBadge
                                                        className='relative' ariaLabel={tr.scheduledTo + " " + item.scheduled.format(dateFormat)}
                                                        label={getRelative(item.scheduled)} icon={Icons.scheduledIcon} />}
                                                {item.due &&
                                                    <DateStatusBadge
                                                        className='relative' ariaLabel={tr.dueAt + " " + item.due.format(dateFormat)}
                                                        label={getRelative(item.due)} icon={Icons.dueIcon} />}
                                                {item.completion &&
                                                    <DateStatusBadge
                                                        className='relative' ariaLabel={tr.completeAt + " " + item.completion.format(dateFormat)}
                                                        label={getRelative(item.completion)} icon={Icons.doneIcon} />}

                                                {item.recurrence &&
                                                    <DateStatusBadge
                                                        className='repeat' ariaLabel={tr.recurrent + ": " + item.recurrence.replace(recurrenceSymbol, '')}
                                                        label={item.recurrence.replace(recurrenceSymbol, '')} icon={Icons.repeatIcon} />}

                                                {item.priority &&
                                                    <DateStatusBadge
                                                        className='priority' ariaLabel={tr.priority + ": " + item.priority}
                                                        label={item.priority.length > 0 ? item.priority + " " + tr.priorityLabel : tr.noPriority}
                                                        icon={Icons.priorityIcon} />}
                                                <FileBadge filePath={item.path} subPath={item.section.subpath || ""} />
                                                {[...new Set(tags)].filter(t => !hideTags.includes(t)).map((t, i) => {
                                                    return < TagBadge tag={t} key={i} />
                                                }
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        }
                        </UserOptionContext.Consumer>
                    )
                }}
            </TaskItemEventHandlersContext.Consumer>
        )
    }
}

const defaultContentProps = {
    display: "",
    fileName: "",
}
type ContentProps = Readonly<typeof defaultContentProps>
class Content extends React.Component<ContentProps> {
    private lastDisplay: string = "";
    private lastFileName: string = "";
    private cachedHtml: string = "";

    render(): React.ReactNode {
        if (this.props.display !== this.lastDisplay || this.props.fileName !== this.lastFileName) {
            const cont = createEl("a");
            MarkdownRenderer.renderMarkdown(this.props.display, cont, this.props.fileName, TasksTimelineView.view!);
            this.cachedHtml = cont.firstElementChild?.innerHTML ?? "";
            this.lastDisplay = this.props.display;
            this.lastFileName = this.props.fileName;
        }
        return <a dangerouslySetInnerHTML={{ __html: this.cachedHtml }} />
    }
}


const defaultStripWithIconProps = {
    status: "task",
    marker: " ",
    useBuiltinStyle: true,
    onToggle: () => { },
}

type StripWithIconProps = Readonly<typeof defaultStripWithIconProps>
class StripWithIcon extends React.Component<StripWithIconProps> {
    private handleChange = () => {
        if (!this.props.useBuiltinStyle) this.props.onToggle();
    };

    private handleLabelClick = () => {
        if (this.props.useBuiltinStyle) this.props.onToggle();
    };

    render(): React.ReactNode {
        return (
            <div className='timeline' >
                <input id="statusMarker" type="checkbox" className={this.props.useBuiltinStyle ? "icon" : ""}
                    data-task={this.props.marker}
                    checked={this.props.marker !== ' '} onChange={this.handleChange}></input>
                {this.props.useBuiltinStyle &&
                    <label htmlFor="statusMarker" className="icon" onClick={this.handleLabelClick}>{Icons.getTaskStatusIcon(this.props.status)}</label>}
            </div>
        )
    }
}

const defaultTagBadgeProps = {
    tag: "",
};

type TagBadgeProps = Readonly<typeof defaultTagBadgeProps>;

class TagBadge extends React.Component<TagBadgeProps> {

    render(): React.ReactNode {
        return (
            <UserOptionContext.Consumer>{({ tagPalette }) => {
                const tag = this.props.tag;
                const tagText = tag.replace("#", "");
                let color;
                if (Object.keys(tagPalette).includes(tag)) color = tagPalette[tag];
                let style: Record<string, unknown>;
                if (color) {
                    style = {
                        '--tag-color': color,
                        '--tag-background': `${color}1a`,
                        'zIndex': 9999,
                    };
                } else {
                    style = {
                        '--tag-color': 'var(--text-muted)',
                        'zIndex': 9999,
                    };
                }
                return (
                    <TaskItemEventHandlersContext.Consumer>{callbacks => (
                        <a href={tag} className={'tag'} target='_blank' rel='noopener' style={style} aria-label={tag}
                            onClick={(e) => {
                                e.stopPropagation();
                                callbacks.handleTagClick(tag);
                            }}>
                            <div className='icon'>{Icons.tagIcon}</div>
                            <div className='label'>{tagText}</div>
                        </a>)}
                    </TaskItemEventHandlersContext.Consumer>)
            }}
            </UserOptionContext.Consumer>
        );
    }
}

const defaultFileBadgeProps = {
    filePath: "",
    subPath: "",
}

type FileBadgeProps = Readonly<typeof defaultFileBadgeProps>;
class FileBadge extends React.Component<FileBadgeProps> {
    render(): React.ReactNode {
        const filePath = this.props.filePath;
        const fileName = getFileTitle(filePath);
        const subPath = this.props.subPath;
        return (
            <a className='file' aria-label={filePath}>
                <div className='icon'>{Icons.fileIcon}</div>
                <div className='label'>{fileName}</div>
                <span className='header'>{subPath != "" ? "  >  " + subPath : subPath}</span>
            </a>)
    }
}

const defaultBadgeProps = {
    className: "",
    ariaLabel: "",
    label: "",
    icon: Icons.taskIcon,
    //onClick: () => { },
}

type BadgeProps = Readonly<typeof defaultBadgeProps>;

class DateStatusBadge extends React.Component<BadgeProps> {

    render(): React.ReactNode {
        const type = this.props.className;
        const aria_label = this.props.ariaLabel;
        const label = this.props.label;
        const icon = this.props.icon;
        return (
            <a className={type} aria-label={aria_label} /*onClick={this.props.onClick}*/>
                <div className='icon'>{icon}</div>
                <div className='label'>{label}</div>
            </a>
        );
    }
}

const defaultModifyBadgeProps = {
    onClick: () => { },
    ariaLabel: "Modify Task" as string,
};
type ModifyBadgeProps = Readonly<typeof defaultModifyBadgeProps>;
class ModifyBadge extends React.Component<ModifyBadgeProps> {
    render(): React.ReactNode {
        return (
            <a aria-label={this.props.ariaLabel} onClick={this.props.onClick}>✏️</a>
        )
    }
}