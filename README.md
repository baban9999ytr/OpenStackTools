# Python Project Template

A modern, production-ready Python project template configured with **Hatchling**, **Ruff** for linting/formatting, and **Pytest** for testing, along with a pre-configured **GitHub Actions CI workflow**.

---

## Getting Started

Follow these steps to create and configure a new repository using this template.

### 1. Create a Repository from this Template

1. Go to [baban9999ytr/python-template](https://github.com/baban9999ytr/python-template).
2. Click the green **Use this template** button in the top right.
3. Select **Create a new repository**.
4. Set your new repository name, description, and visibility, then click **Create repository**.

---

## Setup & Customization Checklist

After creating your repository from this template, complete the following steps to personalize it for your project:

### 1. Update `pyproject.toml`

Open `pyproject.toml` and update the project metadata:

- `name`: Change `"my-project"` to your new package name.
- `version`: Set your starting version (e.g., `"0.1.0"`).
- `description`: Add a short summary of your project.
- `authors`: Replace with your name and email.

### 2. Rename the Source Directory

1. Rename the folder inside `src/`:

   ```bash
   mv src/my_package src/your_package_name
   ```
