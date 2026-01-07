---
description: review today's commits and generate changelog
---

# Code Review & Changelog Generation

## 1. Scope of Review

**Today's Changes Only** (based on current system date):
- All git commits made today: `git log --since="today 00:00"`
- All uncommitted changes: staged + unstaged modifications

Example: If today is 2026-01-01, only review commits and changes from 2026-01-01.

---

## 2. Code Review Checklist

Analyze the code for:
- ✅ Code quality and best practices
- ✅ Potential bugs or security vulnerabilities
- ✅ Architecture and design patterns
- ✅ Performance implications
- ✅ Type safety and error handling
- ✅ Adherence to project guidelines (CLAUDE.md)

---

## 3. Generate Changelog Document

### Content Structure
Categorize changes into:
- **Added**: New features/functionality
- **Modified**: Changed behavior or enhancements
- **Removed**: Deleted code or deprecated features

### File Requirements
**Filename Format**: `YYYYMMDD-main-feature.md`
- Example: `20260101-add-user-authentication.md`
- Use the most significant change for the description

**Save Location**: `functionList/` directory
- Create directory if it doesn't exist

### Formatting Guidelines
- Use clear Markdown structure (headings, lists, code blocks)
- Group by category: Features → Bug Fixes → Refactoring → Other
- Include code snippets for complex changes
- Highlight breaking changes or migration notes
- **Keep it concise**: Focus on "what" and "why", avoid verbosity

---

## 4. Output Style

- Scannable and well-organized
- Concise but comprehensive
- Professional tone
- No unnecessary details
