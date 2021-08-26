import React from "react";
import Button from "@material-ui/core/Button";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { decrement, increment } from "./counterSlice";
import { Box, Paper, Stack } from "@material-ui/core";

export function Counter() {
  const count = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <Box>
      <Paper
        sx={{
          width: 300,
          p: 2,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Button
            aria-label="Increment value"
            onClick={() => dispatch(increment())}
            variant="outlined"
          >
            Increment
          </Button>
          <span>{count}</span>
          <Button
            aria-label="Decrement value"
            onClick={() => dispatch(decrement())}
            variant="outlined"
          >
            Decrement
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
