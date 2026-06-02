import moment, { Moment } from 'moment';
import * as React from 'react';
import { UserOption } from '../../../src/settings';
import { t } from '../../../src/i18n';
import * as TaskMapable from '../../../utils/taskmapable';
import { innerDateFormat, TaskDataModel, TaskStatus } from '../../../utils/tasks';
import { TaskListContext, TodayFocusEventHandlersContext, UserOptionContext } from './context';
import { YearView } from './yearview';


const defaultTimelineProps = {
    userOptions: {} as UserOption,
    taskList: [] as TaskDataModel[]
}
const defaultTimelineStates = {
    filter: "" as string,
    todayFocus: false as boolean,
}
type TimelineProps = Readonly<typeof defaultTimelineProps>;
type TimelineStates = typeof defaultTimelineStates;
export class TimelineView extends React.Component<TimelineProps, TimelineStates> {
    //private calendar: Map<string, Set<number>> = new Map();
    private counterClickHandlers: Record<string, () => void>;

    constructor(props: TimelineProps) {
        super(props);

        this.handleCounterFilterClick = this.handleCounterFilterClick.bind(this);
        this.handleTodayFocus = this.handleTodayFocus.bind(this);

        // 预先绑定计数器点击回调，避免每次 render 创建新函数
        this.counterClickHandlers = {
            todoFilter: () => this.handleCounterFilterClick('todoFilter'),
            overdueFilter: () => this.handleCounterFilterClick('overdueFilter'),
            unplannedFilter: () => this.handleCounterFilterClick('unplannedFilter'),
        };

        this.state = {
            filter: this.props.userOptions.defaultFilters,
            todayFocus: this.props.userOptions.defaultTodayFocus,
        }
    }

    handleCounterFilterClick(filterName: string) {
        if (this.state.filter !== filterName) {
            this.setState({
                filter: filterName,
            })
        } else {
            this.setState({
                filter: ""
            })
        }
    }

    handleTodayFocus() {
        this.setState({
            todayFocus: !this.state.todayFocus,
        })
    }

    render(): React.ReactNode {
        const involvedDates: Set<string> = new Set();
        const taskList = this.props.taskList;
        let overdueCount = 0;
        let unplannedCount = 0;
        let completedCount = 0;
        let cancelledCount = 0;
        taskList.forEach((t: TaskDataModel) => {
            // 收集日期
            t.due && involvedDates.add(t.due.format(innerDateFormat));
            t.scheduled && involvedDates.add(t.scheduled.format(innerDateFormat));
            t.created && involvedDates.add(t.created.format(innerDateFormat));
            t.start && involvedDates.add(t.start.format(innerDateFormat));
            t.completion && involvedDates.add(t.completion.format(innerDateFormat));
            t.dates.forEach((d: Moment) => {
                involvedDates.add(d.format(innerDateFormat));
            });
            // 统计状态计数
            switch (t.status) {
                case TaskStatus.overdue: overdueCount++; break;
                case TaskStatus.unplanned: unplannedCount++; break;
                case TaskStatus.done: completedCount++; break;
                case TaskStatus.cancelled: cancelledCount++; break;
            }
        });

        if (!involvedDates.has(moment().format(innerDateFormat)))
            involvedDates.add(moment().format(innerDateFormat))

        const sortedDatas = [...involvedDates].sort();
        const earliestYear: number = +moment(sortedDatas.first()!.toString()).format("YYYY");
        const latestYear: number = +moment(sortedDatas.last()!.toString()).format("YYYY");
        const years = Array.from({ length: latestYear - earliestYear + 1 }, (_, i) => i + earliestYear);
        const firstDay = sortedDatas.first();
        const lastDay = sortedDatas.last();

        const todoCount: number = taskList.length - unplannedCount - completedCount - cancelledCount - overdueCount;

        const styles = new Array<string>;
        if (!this.props.userOptions.useCounters) styles.push("noCounters");
        if (!this.props.userOptions.useQuickEntry) styles.push("noQuickEntry");
        if (!this.props.userOptions.useYearHeader) styles.push("noYear");
        //if (!this.props.userOptions.useCompletedTasks) styles.push("noDone");
        if (!this.props.userOptions.useFileBadge &&
            !this.props.userOptions.usePriority &&
            !this.props.userOptions.useRecurrence &&
            !this.props.userOptions.useRelative &&
            !this.props.userOptions.useSection &&
            !this.props.userOptions.useTags) styles.push("noInfo");
        else {
            if (!this.props.userOptions.useFileBadge) styles.push("noFile");
            if (!this.props.userOptions.usePriority) styles.push("noPriority");
            if (!this.props.userOptions.useRecurrence) styles.push("noRepeat");
            if (!this.props.userOptions.useRelative) styles.push("noRelative");
            if (!this.props.userOptions.useSection) styles.push("noHeader");
            if (!this.props.userOptions.useTags) styles.push("noTag");
        }

        const quickEntryFiles = new Set(this.props.userOptions.taskFiles);
        if (this.props.userOptions.inbox && this.props.userOptions.inbox !== '')
            quickEntryFiles.add(this.props.userOptions.inbox);
        const dailyNoteFileName = moment().format(this.props.userOptions.dailyNoteFormat) + ".md";
        const daileNoteFolder =
            this.props.userOptions.dailyNoteFolder === '' ?
                '' : this.props.userOptions.dailyNoteFolder.endsWith('/') ?
                    this.props.userOptions.dailyNoteFolder : this.props.userOptions.dailyNoteFolder + '/';
        if (this.props.userOptions.dailyNoteFormat && this.props.userOptions.dailyNoteFormat !== '')
            quickEntryFiles.add(daileNoteFolder + dailyNoteFileName);

        const baseStyles = [...new Set(styles)].join(" ");
        const counterFilter = this.state.filter.length === 0 ? "" :
            this.state.filter + " " +
            this.props.userOptions.counterBehavior;
        const todayFocus = this.state.todayFocus ? "todayFocus" : "";
        return (
            <div className={`taskido ${baseStyles} ${counterFilter} ${todayFocus}`}
                id={`taskido${(new Date()).getTime()}`
                }>
                <TodayFocusEventHandlersContext.Provider value={{ handleTodayFocusClick: this.handleTodayFocus }}>
                    <UserOptionContext.Provider value={{
                        hideTags: this.props.userOptions.hideTags,
                        tagPalette: this.props.userOptions.tagColorPalette,
                        dateFormat: this.props.userOptions.dateFormat,
                        taskFiles: [...quickEntryFiles],
                        select: this.props.userOptions.inbox,
                        forward: this.props.userOptions.forward,
                        useBuiltinStyle: this.props.userOptions.useBuiltinStyle,
                        language: this.props.userOptions.language,
                        counters: [
                            {
                                onClick: this.counterClickHandlers.todoFilter,
                                cnt: todoCount,
                                label: t(this.props.userOptions.language).todo,
                                id: "todo",
                                ariaLabel: t(this.props.userOptions.language).todoTasks
                            }, {
                                onClick: this.counterClickHandlers.overdueFilter,
                                cnt: overdueCount,
                                id: "overdue",
                                label: t(this.props.userOptions.language).overdue,
                                ariaLabel: t(this.props.userOptions.language).overdueTasks
                            }, {
                                onClick: this.counterClickHandlers.unplannedFilter,
                                cnt: unplannedCount,
                                id: "unplanned",
                                label: t(this.props.userOptions.language).unplanned,
                                ariaLabel: t(this.props.userOptions.language).unplannedTasks
                            }
                        ]
                    }}>
                        <span>
                            {years.map((y, i) => {
                                const yearMoment = moment().year(y);
                                const tasksOfYear = taskList.filter(TaskMapable.filterYear(yearMoment));
                                const datesOfYear = [...involvedDates]
                                    .filter(d => moment(d).year() === y)
                                    .sort();
                                return (
                                <TaskListContext.Provider value={
                                    {
                                        taskList: tasksOfYear,
                                        entryOnDate: this.props.userOptions.entryPosition === "top" ? firstDay! :
                                            this.props.userOptions.entryPosition === "bottom" ? lastDay! : moment().format(innerDateFormat),
                                        involvedDates: datesOfYear,
                                    }
                                } key={i}>
                                    <YearView year={y} key={y} />
                                </TaskListContext.Provider>
                                );
                            })}
                        </span>
                    </UserOptionContext.Provider>
                </TodayFocusEventHandlersContext.Provider>
            </div >)
    }
}