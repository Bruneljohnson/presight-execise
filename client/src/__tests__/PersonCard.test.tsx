import { render, screen } from "@testing-library/react";
import PersonCard from "../components/molecules/PersonCard";

const basePerson = {
  id: "1",
  avatar: "https://avatar.com/1.svg",
  first_name: "Alice",
  last_name: "Smith",
  age: 30,
  nationality: "British",
  hobbies: [],
};

describe("PersonCard", () => {
  describe("basic rendering", () => {
    it("renders first and last name", () => {
      render(<PersonCard person={{ ...basePerson, hobbies: [] }} />);
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    it("renders nationality", () => {
      render(<PersonCard person={basePerson} />);
      expect(screen.getByText("British · 30")).toBeInTheDocument();
    });

    it("renders age", () => {
      render(<PersonCard person={basePerson} />);
      expect(screen.getByText("British · 30")).toBeInTheDocument();
    });

    it("renders avatar image with correct src", () => {
      render(<PersonCard person={basePerson} />);
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://avatar.com/1.svg");
    });

    it("renders avatar with first_name as alt text", () => {
      render(<PersonCard person={basePerson} />);
      expect(screen.getByRole("img")).toHaveAttribute("alt", "Alice");
    });
  });

  describe("hobbies display", () => {
    it("renders no hobby badges when hobbies list is empty", () => {
      render(<PersonCard person={{ ...basePerson, hobbies: [] }} />);
      expect(screen.queryByText("Reading")).not.toBeInTheDocument();
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    it("renders only first hobby when one hobby exists", () => {
      render(<PersonCard person={{ ...basePerson, hobbies: ["Reading"] }} />);
      expect(screen.getByText("Reading")).toBeInTheDocument();
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    it("renders both hobbies when exactly two exist", () => {
      render(<PersonCard person={{ ...basePerson, hobbies: ["Reading", "Coding"] }} />);
      expect(screen.getByText("Reading")).toBeInTheDocument();
      expect(screen.getByText("Coding")).toBeInTheDocument();
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    it("renders top 2 hobbies and +n badge for remaining", () => {
      render(<PersonCard person={{ ...basePerson, hobbies: ["Reading", "Coding", "Yoga", "Gaming"] }} />);
      expect(screen.getByText("Reading")).toBeInTheDocument();
      expect(screen.getByText("Coding")).toBeInTheDocument();
      expect(screen.queryByText("Yoga")).not.toBeInTheDocument();
      expect(screen.queryByText("Gaming")).not.toBeInTheDocument();
      expect(screen.getByText("+2")).toBeInTheDocument();
    });

    it("shows +1 when exactly 3 hobbies exist", () => {
      render(<PersonCard person={{ ...basePerson, hobbies: ["Reading", "Coding", "Yoga"] }} />);
      expect(screen.getByText("+1")).toBeInTheDocument();
    });

    it("shows +8 when 10 hobbies exist", () => {
      render(<PersonCard person={{ ...basePerson, hobbies: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] }} />);
      expect(screen.getByText("+8")).toBeInTheDocument();
    });
  });
});
