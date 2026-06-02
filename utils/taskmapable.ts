import { getFileTitle } from "dataview-util/dataview";
import { Link } from "dataview-util/markdown";
import { moment } from "obsidian";
import * as TasksUtil from "./tasks";

export function filterDate(date: moment.Moment) {
    return filterByDateTime(date, "date");
}

export function filterYear(date: moment.Moment) {
    return filterByDateTime(date, "year");
}

function filterByDateTime(date: moment.Moment, by: moment.unitOfTime.StartOf) {
    return (item: TasksUtil.TaskDataModel) => {
        if (item.due && date.isSame(item.due, by)) return true;
        if (item.scheduled && date.isSame(item.scheduled, by)) return true;
        if (item.created && date.isSame(item.created, by)) return true;
        if (item.completion && date.isSame(item.completion, by)) return true;
        if (item.start && date.isSame(item.start, by)) return true;
        for (const [, d] of item.dates) {
            if (date.isSame(d, by)) {
                return true;
            }
        }
        return false;
    }
}

export function filterDateRange(from: moment.Moment, to: moment.Moment) {
    return filterByDateTimeRange(from, to, 'date');
}

function filterByDateTimeRange(from: moment.Moment, to: moment.Moment, by: moment.unitOfTime.StartOf) {
    return (item: TasksUtil.TaskDataModel) => {
        if (item.due && item.due.isBetween(from, to, by)) return true;
        if (item.scheduled && item.scheduled.isBetween(from, to, by)) return true;
        if (item.created && item.created.isBetween(from, to, by)) return true;
        if (item.completion && item.completion.isBetween(from, to, by)) return true;
        if (item.start && item.start.isBetween(from, to, by)) return true;
        for (const [, d] of item.dates) {
            if (d.isBetween(from, to, by)) return true;
        }
        return false;
    }
}

/**
 * This function is taken from TasksPlugin, it is originally named fromLine.
 * We use this function to extract information that matches the TasksPlugin format.
 * @param item 
 * @returns 
 */
export function tasksPluginTaskParser(item: TasksUtil.TaskDataModel): TasksUtil.TaskDataModel {
    let description = item.visual || "";
    let matched: boolean;
    let priority: TasksUtil.PriorityLabel = "";
    let startDate: moment.Moment | undefined = undefined;
    let scheduledDate: moment.Moment | undefined = undefined;
    let dueDate: moment.Moment | undefined = undefined;
    let doneDate: moment.Moment | undefined = undefined;
    let recurrenceRule = '';
    let trailingTags = '';
    const maxRuns = 20;
    let runs = 0;

    do {
        matched = false;
        const priorityMatch = description.match(TasksUtil.TaskRegularExpressions.priorityRegex);
        if (priorityMatch !== null) {
            priority = TasksUtil.TasksPrioritySymbolToLabel[priorityMatch[1] as TasksUtil.TasksPrioritySymbol];
            description = description.replace(TasksUtil.TaskRegularExpressions.priorityRegex, '').trim();
            matched = true;
        }

        const doneDateMatch = description.match(TasksUtil.TaskRegularExpressions.doneDateRegex);
        if (doneDateMatch !== null) {
            doneDate = window.moment(doneDateMatch[1], TasksUtil.TaskRegularExpressions.dateFormat);
            description = description.replace(TasksUtil.TaskRegularExpressions.doneDateRegex, '').trim();
            matched = true;
        }

        const dueDateMatch = description.match(TasksUtil.TaskRegularExpressions.dueDateRegex);
        if (dueDateMatch !== null) {
            dueDate = window.moment(dueDateMatch[1], TasksUtil.TaskRegularExpressions.dateFormat);
            description = description.replace(TasksUtil.TaskRegularExpressions.dueDateRegex, '').trim();
            matched = true;
        }

        const scheduledDateMatch = description.match(TasksUtil.TaskRegularExpressions.scheduledDateRegex);
        if (scheduledDateMatch !== null) {
            scheduledDate = window.moment(scheduledDateMatch[1], TasksUtil.TaskRegularExpressions.dateFormat);
            description = description.replace(TasksUtil.TaskRegularExpressions.scheduledDateRegex, '').trim();
            matched = true;
        }

        const startDateMatch = description.match(TasksUtil.TaskRegularExpressions.startDateRegex);
        if (startDateMatch !== null) {
            startDate = window.moment(startDateMatch[1], TasksUtil.TaskRegularExpressions.dateFormat);
            description = description.replace(TasksUtil.TaskRegularExpressions.startDateRegex, '').trim();
            matched = true;
        }

        const recurrenceMatch = description.match(TasksUtil.TaskRegularExpressions.recurrenceRegex);
        if (recurrenceMatch !== null) {
            recurrenceRule = recurrenceMatch[1].trim();
            description = description.replace(TasksUtil.TaskRegularExpressions.recurrenceRegex, '').trim();
            matched = true;
        }

        const tagsMatch = description.match(TasksUtil.TaskRegularExpressions.hashTagsFromEnd);
        if (tagsMatch != null) {
            description = description.replace(TasksUtil.TaskRegularExpressions.hashTagsFromEnd, '').trim();
            matched = true;
            const tagName = tagsMatch[0].trim();
            trailingTags = trailingTags.length > 0 ? [tagName, trailingTags].join(' ') : tagName;
        }

        runs++;
    } while (matched && runs <= maxRuns);

    if (trailingTags.length > 0) description += ' ' + trailingTags;

    const isTasksTask = [startDate, scheduledDate, dueDate, doneDate].some(d => !!d);

    item.visual = description;
    item.priority = priority;
    item.recurrence = recurrenceRule;
    item.isTasksTask = isTasksTask;
    item.due = dueDate;
    item.scheduled = scheduledDate;
    item.completion = doneDate;
    item.start = startDate;
    item.checked = description.replace(' ', '').length !== 0;

    return item;
}

export function dataviewTaskParser(item: TasksUtil.TaskDataModel): TasksUtil.TaskDataModel {
    let itemText = item.visual || "";
    const inlineFields = itemText.match(TasksUtil.TaskRegularExpressions.keyValueRegex);
    if (!inlineFields) {
        return item;
    }
    for (const inlineField of inlineFields) {
        TasksUtil.TaskRegularExpressions.keyValueRegex.lastIndex = 0;
        const tkv = TasksUtil.TaskRegularExpressions.keyValueRegex.exec(inlineField)!;
        const [text, key, value] = [tkv[0], tkv[1], tkv[2]];
        itemText = itemText.replace(text, '');

        if (!TasksUtil.TaskStatusCollection.includes(key)) continue;
        const fieldDate = moment(value);
        if (!fieldDate.isValid()) {
            console.warn("Parse date for item failed, item: ", inlineFields);
            continue;
        }
        switch (key) {
            case "due":
                item.due = fieldDate; break;
            case "scheduled":
                item.scheduled = fieldDate; break;
            case "complete":
            case "completion":
            case "done":
                item.completion = fieldDate; break;
            case "created":
                item.start = fieldDate; break;
            default:
                item.dates.set(key, fieldDate); break;
        }
    }
    item.visual = itemText;
    return item;
}

export function dailyNoteTaskParser(dailyNoteFormat: string = TasksUtil.innerDateFormat, dailyNoteFolder: string = '') {
    return (item: TasksUtil.TaskDataModel): TasksUtil.TaskDataModel => {
        let dailyNoteDate: moment.Moment;
        const fullPath = item.path.replace(/\\/g, '/');
        
        let pathToParse = fullPath;
        if (dailyNoteFolder) {
            const normalizedFolder = dailyNoteFolder.replace(/\/$/, '');
            if (pathToParse.startsWith(normalizedFolder + '/')) {
                pathToParse = pathToParse.substring((normalizedFolder + '/').length);
            }
        }
        
        if (pathToParse.endsWith('.md')) {
            pathToParse = pathToParse.substring(0, pathToParse.length - 3);
        }
        
        dailyNoteDate = moment(pathToParse, dailyNoteFormat, true);
        
        if (!dailyNoteDate.isValid()) {
            const taskFile: string = getFileTitle(item.path);
            dailyNoteDate = moment(taskFile, dailyNoteFormat, true);
        }
        
        item.dailyNote = dailyNoteDate.isValid();
        if (!item.dailyNote) {
            return item;
        }
        if (!item.start) item.start = dailyNoteDate;
        if (!item.scheduled) item.scheduled = dailyNoteDate;
        if (!item.created) item.created = dailyNoteDate;

        return item;
    }
}
/**
 * !! NEED improvement
 * @param item 
 * @returns 
 */
export function taskLinkParser(item: TasksUtil.TaskDataModel) {

    item.outlinks = [];

    let outerLinkMatch = TasksUtil.TaskRegularExpressions.outerLinkRegex.exec(item.visual!);
    let innerLinkMatch = TasksUtil.TaskRegularExpressions.innerLinkRegex.exec(item.visual!);
    let dataviewDateMatch = TasksUtil.TaskRegularExpressions.keyValueRegex.exec(item.visual!);

    const buildLink = (text: string, display: string, path: string, index: number, inner: boolean) => {
        item.visual = item.visual!.replace(text, display);

        if (item.outlinks.some(l => l.path === path)) return;

        const link = Link.file(path, inner, display);
        link.subpath = index.toString();
        item.outlinks.push(link);
    };

    while (!!outerLinkMatch || (!!innerLinkMatch && !dataviewDateMatch)) {
        if (!!outerLinkMatch && (!!innerLinkMatch && !dataviewDateMatch)) {
            if (outerLinkMatch.index < innerLinkMatch.index) {
                buildLink(outerLinkMatch[0], outerLinkMatch[1], outerLinkMatch[2], outerLinkMatch.index, false);
                innerLinkMatch = TasksUtil.TaskRegularExpressions.innerLinkRegex.exec(item.visual!);
                dataviewDateMatch = TasksUtil.TaskRegularExpressions.keyValueRegex.exec(item.visual!);
                (!!innerLinkMatch && !dataviewDateMatch) &&
                    buildLink(innerLinkMatch[0], innerLinkMatch[1], innerLinkMatch[1], innerLinkMatch.index, true);
            } else {
                buildLink(innerLinkMatch[0], innerLinkMatch[1], innerLinkMatch[1], innerLinkMatch.index, true);
                outerLinkMatch = TasksUtil.TaskRegularExpressions.outerLinkRegex.exec(item.visual!);
                (!!outerLinkMatch) &&
                    buildLink(outerLinkMatch[0], outerLinkMatch[1], outerLinkMatch[2], outerLinkMatch.index, false);
            }
            innerLinkMatch = TasksUtil.TaskRegularExpressions.innerLinkRegex.exec(item.visual!);
            dataviewDateMatch = TasksUtil.TaskRegularExpressions.keyValueRegex.exec(item.visual!);
            outerLinkMatch = TasksUtil.TaskRegularExpressions.outerLinkRegex.exec(item.visual!);
        } else if (outerLinkMatch) {
            buildLink(outerLinkMatch[0], outerLinkMatch[1], outerLinkMatch[2], outerLinkMatch.index, false);
            outerLinkMatch = TasksUtil.TaskRegularExpressions.outerLinkRegex.exec(item.visual!);
        } else if (!!innerLinkMatch && !dataviewDateMatch) {
            buildLink(innerLinkMatch[0], innerLinkMatch[1], innerLinkMatch[1], innerLinkMatch.index, true);
            innerLinkMatch = TasksUtil.TaskRegularExpressions.innerLinkRegex.exec(item.visual!);
            dataviewDateMatch = TasksUtil.TaskRegularExpressions.keyValueRegex.exec(item.visual!);
        }
    }

    return item;
}

export function remainderParser(item: TasksUtil.TaskDataModel): TasksUtil.TaskDataModel {
    const match = item.text.match(TasksUtil.TaskRegularExpressions.remainderRegex);
    if (!match) { return item; }
    item.text = item.text.replace(match[0], "");
    return item;
}

export function tagsParser(item: TasksUtil.TaskDataModel): TasksUtil.TaskDataModel {
    const match = item.visual?.match(TasksUtil.TaskRegularExpressions.hashTags);
    if (!match) {
        return item;
    }
    for (const m of match) {
        item.visual = item.visual?.replace(m, "");
        const tag = m.trim();
        item.tags.push(tag);
    }
    return item;
}

function dateBasedStatusParser(item: TasksUtil.TaskDataModel) {
    if (!item.due && !item.scheduled &&
        !item.start && !item.completion && item.dates.size === 0) {
        item.status = TasksUtil.TaskStatus.unplanned;
        if (item.completed) item.status = TasksUtil.TaskStatus.done;
        return item;
    }

    if (item.completed && (item.scheduled && item.scheduled.isAfter() ||
        item.start && item.start.isAfter())) {
        item.status = TasksUtil.TaskStatus.cancelled;
        return item;
    }

    if (item.completed) {
        item.status = TasksUtil.TaskStatus.done;
        return item;
    }

    const today = moment();
    if (item.due && item.due.isBefore(today, 'date')) {
        item.status = TasksUtil.TaskStatus.overdue;
        return item;
    }

    if (item.due && item.due.isSame(today, 'date')) {
        item.status = TasksUtil.TaskStatus.due;
        return item;
    }

    if (item.start && item.start.isBefore(today, 'date')) {
        item.status = TasksUtil.TaskStatus.process;
        return item;
    }

    if (item.scheduled && item.scheduled.isBefore(today, 'date')) {
        item.status = TasksUtil.TaskStatus.start;
        return item;
    }

    item.status = TasksUtil.TaskStatus.scheduled;
    return item;
}

function markerBasedStatusParser(item: TasksUtil.TaskDataModel) {
    if (!Object.keys(TasksUtil.TaskStatusMarkerMap).contains(item.status)) return dateBasedStatusParser(item);
    item.status = (TasksUtil.TaskStatusMarkerMap as any)[item.status];
    return item;
}

export function postProcessor(item: TasksUtil.TaskDataModel): TasksUtil.TaskDataModel {
    return markerBasedStatusParser(item);
}
