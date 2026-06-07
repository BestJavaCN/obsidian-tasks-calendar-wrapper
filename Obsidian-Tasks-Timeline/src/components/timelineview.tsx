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

    componentDidUpdate(prevProps: TimelineProps, prevState: TimelineStates) {
        if (this.state.activeSpecificTaskFile) {
            const stfFileMap = this.props.userOptions.stfFileMap;
            const isValid = stfFileMap ? this.state.activeSpecificTaskFile in stfFileMap : false;
            if (!isValid) {
                this.setState({ activeSpecificTaskFile: "" });
            }
        }
    }

    private computeDerivedData(taskList: TaskDataModel[], userOptions: UserOption, isSTFContext: boolean = false): DerivedData {
        // When no filter is active (isSTFContext = false), show all tasks including STF tasks.
        // When a panel filter is active (isSTFContext = true), the taskList is already pre-filtered
        // by the caller (computeFilteredDerivedData / computeSTFDerivedData).
        const displayTaskList = taskList;

        // Counter list: exclude non-overdue STF tasks so panel counters remain consistent
        // with what the panels actually display when clicked.
        const counterTaskList = isSTFContext
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

        // Count todo/unplanned/completed/cancelled from counterTaskList (excludes non-overdue STF)
        let todoCount = 0;
        for (const t of counterTaskList) {
            switch (t.status) {
                case TaskStatus.unplanned: unplannedCount++; break;
                case TaskStatus.done: completedCount++; break;
                case TaskStatus.cancelled: cancelledCount++; break;
                case TaskStatus.overdue: break;
                default: todoCount++; break;
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

        // Preview calculations grouped by year (using displayTaskList to include STF tasks in default view)
        const tasksByYear = new Map<number, TaskDataModel[]>();
        const datesByYear = new Map<number, string[]>();
        for (const y of years) {
            const yearMoment = moment().year(y);
            tasksByYear.set(y, displayTaskList.filter(TaskMapable.filterYear(yearMoment)));
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
     * Compute STF counters from the canonical stfFileMap (alias→file paths).
     * Each unique alias gets one counter. Tasks are counted by file path membership
     * rather than per-task stfAlias, so that the same file referenced by multiple
     * aliases contributes to each alias's count independently.
     * Same-alias STF entries are merged: only one counter appears, aggregating all
     * referenced files' tasks with deduplication.
     */
    private computeSTFCounters(
        taskList: TaskDataModel[],
        userOptions: UserOption
    ): Array<{ onClick: () => void; cnt: number; id: string; label: string; ariaLabel: string }> {
        const stfFileMap = userOptions.stfFileMap;
        if (!stfFileMap || Object.keys(stfFileMap).length === 0) return [];

        // Build reverse index: file path → task count (excluding done/cancelled/overdue)
        const pathTaskCount = new Map<string, number>();
        for (const task of taskList) {
            if (task.stfAlias === NON_STF_TASK) continue;
            if (task.status === TaskStatus.done || task.status === TaskStatus.cancelled || task.status === TaskStatus.overdue) continue;
            const count = pathTaskCount.get(task.path) || 0;
            pathTaskCount.set(task.path, count + 1);
        }

        return Object.entries(stfFileMap).map(([alias, filePaths]) => {
            // Deduplicate: count each file's tasks exactly once
            let cnt = 0;
            const countedPaths = new Set<string>();
            for (const filePath of filePaths) {
                if (countedPaths.has(filePath)) continue;
                countedPaths.add(filePath);
                cnt += pathTaskCount.get(filePath) || 0;
            }
            return {
                onClick: () => this.handleSpecificTaskFileClick(alias),
                cnt,
                id: `stf-${alias}`,
                label: alias,
                ariaLabel: alias,
            };
        });
    }

    private getDerivedData(): DerivedData {
        const taskList = this.props.taskList;
        const userOptions = this.props.userOptions;
        // Use reference comparison: when taskList is a new array (e.g. after optimistic update),
        // recompute derived data to reflect updated task statuses.
        if (this.lastTaskListRef !== taskList || this.lastUserOptionsRef !== userOptions) {
            this.lastTaskListRef = taskList;
            this.lastUserOptionsRef = userOptions;
            this.cachedDerived = this.computeDerivedData(taskList, userOptions);
        }
        return this.cachedDerived!;
    }

    /**
     * Compute derived data for a subset of tasks (used when STF filter is active).
     * Filters tasks by file path membership in the STF's file set, rather than by
     * per-task stfAlias. This allows multiple aliases pointing to the same file
     * to each display that file's tasks independently, and same-alias entries
     * pointing to different files to aggregate all files' tasks in one panel.
     */
    private computeSTFDerivedData(stfAlias: string): DerivedData | null {
        const stfFileMap = this.props.userOptions.stfFileMap;
        if (!stfFileMap) return null;

        const filePaths = new Set(stfFileMap[stfAlias] || []);
        if (filePaths.size === 0) return null;

        const taskList = this.props.taskList;
        const stfTasks = taskList.filter(t =>
            filePaths.has(t.path) &&
            t.status !== TaskStatus.overdue &&
            t.status !== TaskStatus.done &&
            t.status !== TaskStatus.cancelled
        );
        if (stfTasks.length === 0) return null;
        return this.computeDerivedData(stfTasks, this.props.userOptions, true);
    }

    /**
     * Compute derived data for native counter filters (todo/overdue/unplanned).
     * Uses data-based filtering instead of CSS-based hiding, significantly
     * reducing DOM element count and improving render performance.
     */
    private computeFilteredDerivedData(filter: string): DerivedData {
        const taskList = this.props.taskList;
        let filteredTasks: TaskDataModel[];

        switch (filter) {
            case 'todoFilter':
                // Todo: non-STF tasks that are not overdue, done, cancelled, or unplanned
                filteredTasks = taskList.filter(t =>
                    (t.stfAlias === NON_STF_TASK || t.status === TaskStatus.overdue) &&
                    t.status !== TaskStatus.overdue &&
                    t.status !== TaskStatus.done &&
                    t.status !== TaskStatus.cancelled &&
                    t.status !== TaskStatus.unplanned
                );
                break;
            case 'overdueFilter':
                // Overdue: all tasks (including STF) with overdue status
                filteredTasks = taskList.filter(t => t.status === TaskStatus.overdue);
                break;
            case 'unplannedFilter':
                // Unplanned: non-STF tasks with unplanned status
                filteredTasks = taskList.filter(t =>
                    t.stfAlias === NON_STF_TASK &&
                    t.status === TaskStatus.unplanned
                );
                break;
            default:
                return this.getDerivedData();
        }

        return this.computeDerivedData(filteredTasks, this.props.userOptions, true);
    }

    render(): React.ReactNode {
        const derived = this.getDerivedData();

        // 将 counters 引用同步到 userOptionContextValue 中 (避免循环依赖)
        derived.userOptionContextValue.counters = derived.counters;
        derived.userOptionContextValue.stfCounters = derived.stfCounters;

        const todayFocus = this.state.todayFocus ? "todayFocus" : "";

        const activeSpecificTaskFile = this.state.activeSpecificTaskFile;
        const stfFilter = activeSpecificTaskFile ? "stfFilter" : "";
        const filterClass = this.state.filter ? this.state.filter : "";

        // Use data-based filtering for both native counters and STF,
        // significantly reducing DOM element count vs CSS-based filtering.
        let taskListContexts = derived.taskListContexts;
        if (activeSpecificTaskFile) {
            const stfDerived = this.computeSTFDerivedData(activeSpecificTaskFile);
            if (stfDerived) {
                taskListContexts = stfDerived.taskListContexts;
            } else {
                // STF has no displayable tasks - show empty task list
                taskListContexts = [{
                    year: moment().year(),
                    value: {
                        taskList: [] as TaskDataModel[],
                        entryOnDate: moment().format(innerDateFormat),
                        involvedDates: [] as string[],
                    },
                }];
            }
        } else if (this.state.filter) {
            // Native counter filter (todo/overdue/unplanned) - use data-based filtering
            const filteredDerived = this.computeFilteredDerivedData(this.state.filter);
            taskListContexts = filteredDerived.taskListContexts;
        }

        // Inject dynamic state into context value
        const contextValue = {
            ...derived.userOptionContextValue,
            activeSpecificTaskFile,
            handleSpecificTaskFileClick: this.handleSpecificTaskFileClick,
        };

        return (
            <div className={`taskido ${derived.styles} ${todayFocus} ${stfFilter} ${filterClass}`}
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
