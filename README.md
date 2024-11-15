# Neurodiversity In Tech Website

The draft is currently auto-deployed [at this Netlify URL](https://ndit-staging.netlify.app) and will officially be hosted at [nd-in-tech.org](nd-in-tech.org).

If you're neurodivergent, consider [joining the ND In Tech community](https://nd-in-tech.org)!

## Contributing

Anyone can help! You don’t need open-source experience, and you don’t need to be neurodivergent to contribute. This is an open-source and volunteer-driven project that you can add to your resume or LinkedIn. We appreciate all contributions, both large and small.

You can find our [full ticket list here](https://github.com/orgs/nditcommunity/projects/1/views/6?filterQuery=is%3Aissue). You can filter for [only tickets that need help here](https://github.com/nditcommunity/nditcommunity.github.io/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

### Designers

In-progress wireframe brainstorming is happening on Penpot. Request an invite via the Discussions tab or by commenting on an existing design ticket. Make sure to tag an owner (see Team section below).

### Developers

We use JavaScript, HTML, CSS, 11ty, Prettier, and Netlify.

#### 1. Clone project

- Clone the project locally (do not fork) by entering this in your terminal:

  ```
  git clone https://github.com/nditcommunity/nditcommunity.github.io.git
  ```

#### 2. Run project

- Enter the following in your terminal:

  ```
  npx @11ty/eleventy --serve
  ```

- When you're asked if you want to install relevant packages, respond `y`.

- You _may_ need to update related libraries, including tools like Homebrew or Node.js, to ensure compatibility.

- Run the above eleventy serve command again.

- Open the site in your browser at `localhost:8080`.

#### 3. Take a ticket

- Select a ticket from the "To Do" column on [our issue board](https://github.com/orgs/nditcommunity/projects/1/views/6?filterQuery=is%3Aissue) that has _both_ "good first issue" and "help needed" labels.
- Assign the ticket to yourself and remove the "helper wanted" label.
- Drag the ticket to the "In Progress" column.

#### 4. Work on ticket

- Name the branch using the issue number and a short name, like `6-favicon` or `18-day-night-toggle`.
- Request write access by tagging an owner (see Team section below) in the issue ticket.
- Create a Pull Request (PR) into `main`, and fill in the auto-generated PR template. If it's a work in progress, note this in the description and ignore sections below "Type of change".

#### 5. Code review

- Run this command in your terminal to ensure your code meets formatting standards before submission:
  ```
  npx prettier --write .
  ```
- When the PR is ready for code review, request review from an owner.
- An owner will review your code or respond to questions.
- When approved, an owner will merge your PR into `main`. _Only owners are permitted to merge anything into main._

### Team

The **owners** of the repo are @hayleyw7 and @royemosby.

All contributors, including the owners, are dedicated volunteers.

While most contributors are members of the ND In Tech community, we are also fortunate to have incredible support from allies.

## Licensing

The website is open-source and licensed under an MIT License.
