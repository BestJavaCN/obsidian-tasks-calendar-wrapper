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
interface DerivedData {
    sortedDates: string[];
    firstDay: string;
    lastDay: string;
    years: number[];
    tasksByYear: Map<number, TaskDataModel[]>;
    datesByYear: Map<number, string[]>;
    counts: { todo: number; overdue: number; unplanned: number; completed: number; cancelled: number };
    quickEntryFiles: string[];
    styles: string;
    counters: Array<{ onClick: () => void; cnt: number; id: string; label: string; ariaLabel: string }>;
    userOptionContextValue: React.ComponentProps<typeof UserOptionContext.Provider>['value'];
    taskListContexts: Array<{ year: number; value: React.ComponentProps<typeof TaskListContext.Provider>['value'] }>;
}

export class TimelineView extends React.Component<TimelineProps, TimelineStates> {
    private counterClickHandlers: Record<string, () => void>;
    private lastTaskListRef: TaskDataModel[] | null = null;
    private lastUserOptionsRef: UserOption | null = null;
    private cachedDerived: DerivedData | null = null;

    constructor(props: TimelineProps) {
        super(props);

        this.handleCounterFilterClick = this.handleCounterFilterClick.bind(this);
        this.handleTodayFocus = this.handleTodayFocus.bind(this);

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
            this.setState({ filter: filterName });
        } else {
            this.setState({ filter: "" });
        }
    }

    handleTodayFocus() {
        this.setState({ todayFocus: !this.state.todayFocus });
    }

    private computeDerivedData(taskList: TaskDataModel[], userOptions: UserOption): DerivedData {
        const involvedDates: Set<string> = new Set();
        let overdueCount = 0;
        let unplannedCount = 0;
        let completedCount = 0;
        let cancelledCount = 0;

        for (let i = 0; i < taskList.length; i++) {
            const t = taskList[i];
            if (t.due) involvedDates.add(t.due.format(innerDateFormat));
            if (t.scheduled) involvedDates.add(t.scheduled.format(innerDateFormat));
            if (t.created) involvedDates.add(t.created.format(innerDateFormat));
            if (t.start) involvedDates.add(t.start.format(innerDateFormat));
            if (t.completion) involvedDates.add(t.completion.format(innerDateFormat));
            const dates = t.dates;
            if (dates.size > 0) {
                dates.forEach((d: Moment) => { involvedDates.add(d.format(innerDateFormat)); });
            }
            switch (t.status) {
                case TaskStatus.overdue: overdueCount++; break;
                case TaskStatus.unplanned: unplannedCount++; break;
                case TaskStatus.done: completedCount++; break;
                case TaskStatus.cancelled: cancelledCount++; break;
            }
        }

        const todayStr = moment().format(innerDateFormat);
        involvedDates.add(todayStr);

        const sortedDates = [...involvedDates].sort();
        const firstDay = sortedDates[0];
        const lastDay = sortedDates[sortedDates.length - 1];
        const earliestYear = +moment(firstDay).format("YYYY");
        const latestYear = +moment(lastDay).format("YYYY");
        const years = Array.from({ length: latestYear - earliestYear + 1 }, (_, i) => i + earliestYear);

        // 预计算每年分组，避免 render 中重复 filter
        const tasksByYear = new Map<number, TaskDataModel[]>();
        const datesByYear = new Map<number, string[]>();
        for (const y of years) {
            const yearMoment = moment().year(y);
            tasksByYear.set(y, taskList.filter(TaskMapable.filterYear(yearMoment)));
            datesByYear.set(y, sortedDates.filter(d => moment(d).year() === y));
        }

        const todoCount = taskList.length - unplannedCount - completedCount - cancelledCount - overdueCount;

        // 预计算样式字符串
        const stylesArr: string[] = [];
        if (!userOptions.useCounters) stylesArr.push("noCounters");
        if (!userOptions.useQuickEntry) stylesArr.push("noQuickEntry");
        if (!userOptions.useYearHeader) stylesArr.push("noYear");
        if (!userOptions.useFileBadge &&
            !userOptions.usePriority &&
            !userOptions.useRecurrence &&
            !userOptions.useRelative &&
            !userOptions.useSection &&
            !userOptions.useTags) {
            stylesArr.push("noInfo");
        } else {
            if (!userOptions.useFileBadge) stylesArr.push("noFile");
            if (!userOptions.usePriority) stylesArr.push("noPriority");
            if (!userOptions.useRecurrence) stylesArr.push("noRepeat");
            if (!userOptions.useRelative) stylesArr.push("noRelative");
            if (!userOptions.useSection) stylesArr.push("noHeader");
            if (!userOptions.useTags) stylesArr.push("noTag");
        }

        // 预计算 quickEntryFiles
        const quickEntryFiles = [...userOptions.taskFiles];
        if (userOptions.inbox && userOptions.inbox !== '')
            quickEntryFiles.push(userOptions.inbox);
        const dailyNoteFileName = moment().format(userOptions.dailyNoteFormat) + ".md";
        const dailyNoteFolder = userOptions.dailyNoteFolder === ''
            ? ''
            : userOptions.dailyNoteFolder.endsWith('/')
                ? userOptions.dailyNoteFolder
                : userOptions.dailyNoteFolder + '/';
        if (userOptions.dailyNoteFormat && userOptions.dailyNoteFormat !== '')
            quickEntryFiles.push(dailyNoteFolder + dailyNoteFileName);

        return {
            sortedDates,
            firstDay,
            lastDay,
            years,
            tasksByYear,
            datesByYear,
            counts: { todo: todoCount, overdue: overdueCount, unplanned: unplannedCount, completed: completedCount, cancelled: cancelledCount },
            quickEntryFiles,
            styles: [...new Set(stylesArr)].join(" "),
            counters: [
                {
                    onClick: this.counterClickHandlers.todoFilter,
                    cnt: todoCount,
                    label: t(userOptions.language).todo,
                    id: "todo",
                    ariaLabel: t(userOptions.language).todoTasks
                }, {
                    onClick: this.counterClickHandlers.overdueFilter,
                    cnt: overdueCount,
                    id: "overdue",
                    label: t(userOptions.language).overdue,
                    ariaLabel: t(userOptions.language).overdueTasks
                }, {
                    onClick: this.counterClickHandlers.unplannedFilter,
                    cnt: unplannedCount,
                    id: "unplanned",
                    label: t(userOptions.language).unplanned,
                    ariaLabel: t(userOptions.language).unplannedTasks
                }
            ],
            userOptionContextValue: {
                hideTags: userOptions.hideTags,
                tagPalette: userOptions.tagColorPalette,
                dateFormat: userOptions.dateFormat,
                taskFiles: quickEntryFiles,
                select: userOptions.inbox,
                forward: userOptions.forward,
                useBuiltinStyle: userOptions.useBuiltinStyle,
                language: userOptions.language,
                counters: [] as Array<{ onClick: () => void; cnt: number; id: string; label: string; ariaLabel: string }>,
            },
            taskListContexts: years.map(y => ({
                year: y,
                value: {
                    taskList: tasksByYear.get(y)!,
                    entryOnDate: userOptions.entryPosition === "top" ? firstDay :
                        userOptions.entryPosition === "bottom" ? lastDay : moment().format(innerDateFormat),
                    involvedDates: datesByYear.get(y)!,
                },
            })),
        };
    }

    private getDerivedData(): DerivedData {
        const taskList = this.props.taskList;
        const userOptions = this.props.userOptions;
        if (this.lastTaskListRef !== taskList || this.lastUserOptionsRef !== userOptions) {
            this.lastTaskListRef = taskList;
            this.lastUserOptionsRef = userOptions;
            this.cachedDerived = this.computeDerivedData(taskList, userOptions);
        }
        return this.cachedDerived!;
    }

    render(): React.ReactNode {
        const derived = this.getDerivedData();

        // 将 counters 引用同步到 userOptionContextValue 中 (避免循环依赖)
        derived.userOptionContextValue.counters = derived.counters;

        const counterFilter = this.state.filter.length === 0 ? "" :
            this.state.filter + " " + this.props.userOptions.counterBehavior;
        const todayFocus = this.state.todayFocus ? "todayFocus" : "";

        return (
            <div className={`taskido ${derived.styles} ${counterFilter} ${todayFocus}`}
                id={`taskido${(new Date()).getTime()}`}>
                <TodayFocusEventHandlersContext.Provider value={{ handleTodayFocusClick: this.handleTodayFocus }}>
                    <UserOptionContext.Provider value={derived.userOptionContextValue}>
                        <span>
                            {derived.taskListContexts.map((ctx, i) => (
                                <TaskListContext.Provider value={ctx.value} key={i}>
                                    <YearView year={ctx.year} key={ctx.year} />
                                </TaskListContext.Provider>
                            ))}
                        </span>
                    </UserOptionContext.Provider>
                </TodayFocusEventHandlersContext.Provider>
            </div >)
    }
}