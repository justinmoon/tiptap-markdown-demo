import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders tiptap editor", () => {
  render(<App />);
  const editorElement = screen.getByText(/Hello World!/i);
  expect(editorElement).toBeInTheDocument();
});
