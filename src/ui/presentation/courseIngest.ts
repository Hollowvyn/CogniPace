/** Presentation-only normalization for the dashboard course-ingest form. */
import { AppShellPayload } from "../../domain/views";

export interface CourseFormState {
  chapterId: string;
  courseId: string;
  input: string;
  markAsStarted: boolean;
}

/** Resolves the selected course and chapter to valid options from the current payload. */
export function resolveCourseForm(
  payload: AppShellPayload | null,
  previous: CourseFormState
): CourseFormState {
  const options = payload?.courseOptions ?? [];
  const selectedCourse =
    options.find((course) => course.id === previous.courseId) ?? options[0];

  if (!selectedCourse) {
    return {
      ...previous,
      chapterId: "",
      courseId: "",
    };
  }

  const selectedChapter =
    selectedCourse.chapterOptions.find(
      (chapter) => chapter.id === previous.chapterId
    ) ?? selectedCourse.chapterOptions[0];

  return {
    ...previous,
    chapterId: selectedChapter?.id ?? "",
    courseId: selectedCourse.id,
  };
}
