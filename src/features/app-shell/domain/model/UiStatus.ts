export interface UiStatus {
  message: string;
  isError: boolean;
  scope?: "course" | "recommendation" | "surface";
}
