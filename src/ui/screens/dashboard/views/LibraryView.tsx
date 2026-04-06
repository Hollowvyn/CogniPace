/** Dashboard library screen for searchable and filterable tracked problems. */
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React from "react";

import { AppShellPayload, LibraryProblemRow } from "../../../../domain/views";
import { SurfaceCard, ToneChip } from "../../../components";
import { LibraryFilters } from "../../../presentation/library";
import {
  difficultyTone,
  formatDisplayDate,
  formatStudyPhase,
} from "../../../presentation/studyState";

export interface LibraryViewProps {
  filters: LibraryFilters;
  onFilterChange: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  onOpenProblem: (target: { slug: string }) => Promise<void>;
  payload: AppShellPayload | null;
  rows: LibraryProblemRow[];
}

export function LibraryView(props: LibraryViewProps) {
  return (
    <SurfaceCard label="Library" title="All Tracked Problems">
      <Grid container spacing={1.5}>
        <Grid size={{ md: 4, xs: 12 }}>
          <TextField
            fullWidth
            label="Search title or slug"
            onChange={(event) => {
              props.onFilterChange((current) => ({
                ...current,
                query: event.target.value,
              }));
            }}
            value={props.filters.query}
          />
        </Grid>
        <Grid size={{ md: 3, xs: 12 }}>
          <FormControl fullWidth>
            <InputLabel id="library-filter-course-label">Course</InputLabel>
            <Select
              label="Course"
              labelId="library-filter-course-label"
              onChange={(event) => {
                props.onFilterChange((current) => ({
                  ...current,
                  courseId: event.target.value,
                }));
              }}
              value={props.filters.courseId}
            >
              <MenuItem value="all">All courses</MenuItem>
              {(props.payload?.courses ?? []).map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ md: 2.5, xs: 12 }}>
          <FormControl fullWidth>
            <InputLabel id="library-filter-difficulty-label">
              Difficulty
            </InputLabel>
            <Select
              label="Difficulty"
              labelId="library-filter-difficulty-label"
              onChange={(event) => {
                props.onFilterChange((current) => ({
                  ...current,
                  difficulty: event.target.value,
                }));
              }}
              value={props.filters.difficulty}
            >
              <MenuItem value="all">All difficulty</MenuItem>
              <MenuItem value="Easy">Easy</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Hard">Hard</MenuItem>
              <MenuItem value="Unknown">Unknown</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ md: 2.5, xs: 12 }}>
          <FormControl fullWidth>
            <InputLabel id="library-filter-status-label">Status</InputLabel>
            <Select
              label="Status"
              labelId="library-filter-status-label"
              onChange={(event) => {
                props.onFilterChange((current) => ({
                  ...current,
                  status: event.target.value,
                }));
              }}
              value={props.filters.status}
            >
              <MenuItem value="all">All status</MenuItem>
              <MenuItem value="due">Due now</MenuItem>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="review">Review</MenuItem>
              <MenuItem value="learning">Learning</MenuItem>
              <MenuItem value="relearning">Relearning</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Problem</TableCell>
              <TableCell>Difficulty</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Retention</TableCell>
              <TableCell>Next Review</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {props.rows.map((row) => {
              const primaryCourse = row.courses[0];
              const studyStateSummary = row.studyStateSummary;
              const phaseLabel = studyStateSummary
                ? formatStudyPhase(studyStateSummary.phase)
                : "NEW";
              const statusLabel = studyStateSummary?.isDue
                ? `${phaseLabel} · DUE NOW`
                : phaseLabel;

              return (
                <TableRow key={row.problem.leetcodeSlug}>
                  <TableCell>
                    <Typography variant="subtitle2">{row.problem.title}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {row.problem.leetcodeSlug}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <ToneChip
                      label={row.problem.difficulty}
                      tone={difficultyTone(row.problem.difficulty)}
                    />
                  </TableCell>
                  <TableCell>
                    {primaryCourse ? primaryCourse.courseName : "Independent"}
                  </TableCell>
                  <TableCell>{statusLabel}</TableCell>
                  <TableCell>
                    {studyStateSummary?.retrievability !== undefined ? (
                      <Typography
                        sx={{
                          color:
                            studyStateSummary.retrievability >= 0.85
                              ? "success.main"
                              : studyStateSummary.retrievability >= 0.7
                                ? "warning.main"
                                : "error.main",
                          fontWeight: 500,
                        }}
                        variant="body2"
                      >
                        {Math.round(studyStateSummary.retrievability * 100)}%
                      </Typography>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDisplayDate(studyStateSummary?.nextReviewAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => {
                        void props.onOpenProblem({
                          slug: row.problem.leetcodeSlug,
                        });
                      }}
                      variant="outlined"
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {props.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary" variant="body2">
                    No tracked problems match the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </SurfaceCard>
  );
}
