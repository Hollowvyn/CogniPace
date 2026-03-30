/** Repository for course-related runtime mutations. */
import { sendMessage } from "../../extension/runtime/client";

/** Switches the active course tracked by the current user settings. */
export async function switchActiveCourse(courseId: string) {
  return sendMessage("SWITCH_ACTIVE_COURSE", { courseId });
}

/** Changes the active chapter inside the current course. */
export async function setActiveCourseChapter(
  courseId: string,
  chapterId: string
) {
  return sendMessage("SET_ACTIVE_COURSE_CHAPTER", {
    courseId,
    chapterId,
  });
}

/** Adds a problem to a specific course chapter using user-provided input. */
export async function addProblemToCourse(input: {
  courseId: string;
  chapterId: string;
  input: string;
  markAsStarted?: boolean;
}) {
  return sendMessage("ADD_PROBLEM_TO_COURSE", input);
}
