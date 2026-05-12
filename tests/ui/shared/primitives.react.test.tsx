import {
  SurfaceControlRow,
  SurfaceTableContainer,
  ToneChip,
} from "@design-system/atoms";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { describe, expect, it } from "vitest";

import { render, screen } from "../support/render";

describe("shared CogniPace UI primitives", () => {
  it("renders tone chips as the shared badge surface", () => {
    render(
      <>
        <ToneChip label="Danger" tone="danger" />
        <ToneChip label="Info" tone="info" />
        <ToneChip label="Success" tone="success" />
      </>
    );

    expect(screen.getByText("Danger")).toBeInTheDocument();
    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("preserves semantic table markup inside the shared table surface", () => {
    render(
      <SurfaceTableContainer>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Two Sum</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </SurfaceTableContainer>
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Two Sum" })).toBeInTheDocument();
  });

  it("renders labelled dashboard control rows without custom screen styling", () => {
    render(
      <SurfaceControlRow
        control={<button type="button">Toggle</button>}
        helper="Visible helper copy."
        label="Review mode"
      />
    );

    expect(screen.getByText("Review mode")).toBeInTheDocument();
    expect(screen.getByText("Visible helper copy.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle" })).toBeInTheDocument();
  });
});
