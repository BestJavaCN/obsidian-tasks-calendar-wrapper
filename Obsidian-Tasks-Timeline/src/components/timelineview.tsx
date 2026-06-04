import moment, { Moment } from 'moment';
import * as React from 'react';
import { UserOption } from '../../../src/settings';
import { t } from '../../../src/i18n';
import * as TaskMapable from '../../../utils/taskmapable';
import { innerDateFormat, NON_STF_TASK, TaskDataModel, TaskStatus } from '../../../utils/tasks';
import { TaskListContext, TodayFocusEventHandlersContext, UserOptionContext } from './context';
import { YearView } from './yearview';


const defaultTimelineProps = {
    userOptions: {} as UserOption,
    taskList: [] as TaskDataModel[],
}
const defaultTimelineStates = {
    filter: "" as string,
    todayFocus: false as boolean,
    activeSpecificTaskFile: "" as string,
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
    stfCounters: Array<{ onClick: () => void; cnt: number; id: string; label: string; ariaLabel: string }>;
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
        this.handleSpecificTaskFileClick = this.handleSpecificTaskFileClick.bind(this);

        this.counterClickHandlers = {
            todoFilter: () => this.handleCounterFilterClick('todoFilter'),
            overdueFilter: () => this.handleCounterFilterClick('overdueFilter'),
            unplannedFilter: () => this.handleCounterFilterClick('unplannedFilter'),
        };

        this.state = {
            filter: this.props.userOptions.defaultFilters,
            todayFocus: this.props.userOptions.defaultTodayFocus,
            activeSpecificTaskFile: "",
        }
    }

    handleCounterFilterClick(filterName: string) {
        // Clear specific task file filter when a regular counter is clicked (mutually exclusive)
        this.setState({ activeSpecificTaskFile: "" });
        if (this.state.filter !== filterName) {
            this.setState({ filter: filterName });
        } else {
            this.setState({ filter: "" });
        }
    }

    handleSpecificTaskFileClick(alias: string) {
        // Clear regular filter when a specific task file counter is clicked (mutually exclusive)
        this.setState({ filter: "" });
        if (this.state.activeSpecificTaskFile !== alias) {
            this.setState({ activeSpecificTaskFile: alias });
        } else {
            this.setState({ activeSpecificTaskFile: "" });
        }
    }

    handleTodayFocus() {
        this.setState({ todayFocus: !this.state.todayFocus });
    }

    private computeDerivedData(taskList: TaskDataModel[], userOptions: UserOption, isSTFContext: boolean = false): DerivedData {
        // Main task list: exclude non-overdue STF tasks.
        // STF tasks only appear in their own STF panels and the Overdue panel.
        // When computing for an STF context, all tasks in the list are already STF-filtered.
        const mainTaskList = isSTFContext
            ? taskList
            : taskList.filter(t =>
                t.stfAlias === NON_STF_TASK || t.status === TaskStatus.overdue
            );

        const involvedDates: Set<string> = new Set();
        let overdueCount = 0;
        let unplannedCount = 0;
        let completedCount = 0;
        let cancelledCount = 0;

        // Collect dates from ALL tasks (including STF) so date ranges are complete
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
            // Count overdue from ALL tasks (STF overdue should appear in Overdue panel)
            if (t.status === TaskStatus.overdue) overdueCount++;
        }

        // Count todo/unplanned/completed/cancelled from mainTaskList only
        for (const t of mainTaskList) {
            switch (t.status) {
                case TaskStatus.unplanned: unplannedCount++; break;
                case TaskStatus.done: completedCount++; break;
                case TaskStatus.cancelled: cancelledCount++; break;
            }
        }

        const todoCount = mainTaskList.length - unplannedCount - completedCount - cancelledCount;

        const todayStr = moment().format(innerDateFormat);
        involvedDates.add(todayStr);

        const sortedDates = [...involvedDates].sort();
        const firstDay = sortedDates[0];
        const lastDay = sortedDates[sortedDates.length - 1];
        const earliestYear = +moment(firstDay).format("YYYY");
        const latestYear = +moment(lastDay).format("YYYY");
        const years = Array.from({ length: latestYear - earliestYear + 1 }, (_, i) => i + earliestYear);

        // Preview calculations grouped by year (using mainTaskList for Todo/Overdue/Unplanned view)
        const tasksByYear = new Map<number, TaskDataModel[]>();
        const datesByYear = new Map<number, string[]>();
        for (const y of years) {
            const yearMoment = moment().year(y);
            tasksByYear.set(y, mainTaskList.filter(TaskMapable.filterYear(yearMoment)));
            datesByYear.set(y, sortedDates.filter(d => moment(d).year() === y));
        }

        // Preview calculation style string
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

        // Preview calculation quickEntryFiles
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

        // Add specific task files to quick entry panel
        if (userOptions.useSpecificTaskFiles && userOptions.specificTaskFiles) {
            for (const stf of userOptions.specificTaskFiles) {
                if (stf.enabled && stf.path && !quickEntryFiles.includes(stf.path)) {
                    quickEntryFiles.push(stf.path);
                }
            }
        }

        // Compute STF counters from the full task list
        const stfCounters = this.computeSTFCounters(taskList, userOptions);

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
            stfCounters,
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
                stfCounters: [] as Array<{ onClick: () => void; cnt: number; id: string; label: string; ariaLabel: string }>,
                activeSpecificTaskFile: "" as string,
                handleSpecificTaskFileClick: this.handleSpecificTaskFileClick,
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

    /**
     * Compute STF counters from the unified task list.
     * Each enabled STF gets a counter showing the count of its non-done, non-cancelled tasks.
     */
    private computeSTFCounters(
        taskList: TaskDataModel[],
        userOptions: UserOption
    ): Array<{ onClick: () => void; cnt: number; id: string; label: string; ariaLabel: string }> {
        if (!userOptions.useSpecificTaskFiles || !userOptions.specificTaskFiles) return [];

        const enabledSTFs = userOptions.specificTaskFiles.filter(f => f.enabled && f.path);
        if (enabledSTFs.length === 0) return [];

        // Count tasks by alias, excluding completed, cancelled, and overdue tasks
        const aliasCounts = new Map<string, number>();
        for (const task of taskList) {
            if (task.stfAlias === NON_STF_TASK) continue;
            if (task.status === TaskStatus.done || task.status === TaskStatus.cancelled || task.status === TaskStatus.overdue) continue;
            const count = aliasCounts.get(task.stfAlias) || 0;
            aliasCounts.set(task.stfAlias, count + 1);
        }

        return enabledSTFs.map(stf => {
            const alias = stf.alias || stf.path;
            return {
                onClick: () => this.handleSpecificTaskFileClick(alias),
                cnt: aliasCounts.get(alias) || 0,
                id: `stf-${alias}`,
                label: alias,
                ariaLabel: alias,
            };
        });
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

    /**
     * Compute derived data for a subset of tasks (used when STF filter is active).
     * Uses the same computeDerivedData logic but with STF-filtered tasks.
     */
    private computeSTFDerivedData(stfAlias: string): DerivedData | null {
        const taskList = this.props.taskList;
        const stfTasks = taskList.filter(t =>
            t.stfAlias === stfAlias &&
            t.status !== TaskStatus.overdue &&
            t.status !== TaskStatus.done &&
            t.status !== TaskStatus.cancelled
        );
        if (stfTasks.length === 0) return null;
        return this.computeDerivedData(stfTasks, this.props.userOptions, true);
    }

    render(): React.ReactNode {
        const derived = this.getDerivedData();

        // 将 counters 引用同步到 userOptionContextValue 中 (避免循环依赖)
        derived.userOptionContextValue.counters = derived.counters;
        derived.userOptionContextValue.stfCounters = derived.stfCounters;

        const counterFilter = this.state.filter.length === 0 ? "" :
            this.state.filter + " " + this.props.userOptions.counterBehavior;
        const todayFocus = this.state.todayFocus ? "todayFocus" : "";

        const activeSpecificTaskFile = this.state.activeSpecificTaskFile;
        const stfFilter = activeSpecificTaskFile ? "stfFilter" : "";

        // When a specific task file is active, compute derived data from only
        // the matching STF tasks (excluding overdue/completed/cancelled).
        // This uses the unified taskList as the single source of truth.
        let taskListContexts = derived.taskListContexts;
        let stfCounters = derived.stfCounters;
        if (activeSpecificTaskFile) {
            const stfDerived = this.computeSTFDerivedData(activeSpecificTaskFile);
            if (stfDerived) {
                taskListContexts = stfDerived.taskListContexts;
                // Show STF counters when STF is active too
                stfCounters = stfDerived.stfCounters;
            } else {
                // STF has no displayable tasks - show empty view
                taskListContexts = [];
            }
        }

        // Inject dynamic state into context value
        const contextValue = {
            ...derived.userOptionContextValue,
            activeSpecificTaskFile,
            handleSpecificTaskFileClick: this.handleSpecificTaskFileClick,
        };

        return (
            <div className={`taskido ${derived.styles} ${counterFilter} ${todayFocus} ${stfFilter}`}
                id={`taskido${(new Date()).getTime()}`}>
                <TodayFocusEventHandlersContext.Provider value={{ handleTodayFocusClick: this.handleTodayFocus }}>
                    <UserOptionContext.Provider value={contextValue}>
                        <span>
                            {taskListContexts.map((ctx, i) => (
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
