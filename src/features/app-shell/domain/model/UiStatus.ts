export interface UiStatus {
  message: string;
  isError: boolean;
  scope?: "track" | "recommendation" | "surface";
}
