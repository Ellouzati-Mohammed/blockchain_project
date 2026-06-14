import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the blockchain dashboard", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: /catalogue des contrats/i })
  ).toBeInTheDocument();
});
