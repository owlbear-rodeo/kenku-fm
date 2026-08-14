import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { TemporaryProductMark } from "../../src/renderer/common/TemporaryProductMark";

describe("TemporaryProductMark", () => {
  it("provides an accessible Dungeon Jockey name", () => {
    render(<TemporaryProductMark />);

    expect(screen.getByLabelText("Dungeon Jockey temporary mark"))
      .toHaveAccessibleName("Dungeon Jockey temporary mark");
    expect(screen.getByText("DJ")).toBeInTheDocument();
  });
});
