# PresentOn PPT Feature Enhancement Requirements

## 1. Background

Currently, the PPT generation frontend framework and BFF layer design are complete, and Presenton backend service integration is working. However, there are issues:
- Generated PPTs lack a display page
- Users cannot view their historical PPTs
- Users cannot preview or download PPT content

## 2. Functional Requirements

### 2.1 "My Presentations" List Page

**Page Path**: `/tools/my-presentations`

**Description**:
- Display all user-generated PPTs
- Each PPT shown as a card using CometCard component
- Card content includes:
  - PPT title
  - Generation time (formatted)
  - Thumbnail (if available)
  - Number of slides

**User Interactions**:
- Click card to navigate to preview page
- Support loading state display
- Empty state prompt (when no PPTs)
- Error handling and retry mechanism

### 2.2 PPT Preview Page

**Page Path**: `/tools/my-presentations/[id]`

**Description**:
- Display detailed content of a single PPT
- Preview all slide content (text, layout)
- Provide download functionality

**Page Structure**:
- Header: PPT title and metadata
- Main content: Slide preview area
  - Slide thumbnail list or large preview
  - Support switching between slides
- Toolbar (top or bottom):
  - Download button (supports PPTX and PDF formats)
  - Back to list button

**User Interactions**:
- Click download button to trigger PPT export and download
- Slide navigation (previous/next)
- Loading state and error handling

### 2.3 Navigation Bar Update

**Current Navigation**: Home - PPT Generator - OCR Recognition - Tianyancha - User

**Updated Navigation**: Home - PPT Generator - My Presentations - User

**Changes**:
- Remove "OCR Recognition" link
- Remove "Tianyancha" link
- Add "My Presentations" link pointing to `/tools/my-presentations`
- Use appropriate icon (e.g., FolderOpen or FileStack)

## 3. Technical Requirements

### 3.1 BFF Layer API Extension

New BFF layer endpoints needed:

1. **Get User's All PPT List**
   - Route: `GET /api/ppt/presentations`
   - Presenton API: `GET /api/v1/ppt/presentation/all`
   - Returns: PPT list data

2. **Get Single PPT Details**
   - Route: `GET /api/ppt/presentations/[id]`
   - Presenton API: `GET /api/v1/ppt/presentation/{id}`
   - Returns: PPT details and slide data

3. **Export PPT**
   - Route: `POST /api/ppt/presentations/[id]/export`
   - Presenton API: `POST /api/v1/ppt/presentation/export`
   - Returns: Download link

### 3.2 Client API Functions

Add to `src/lib/api/ppt.ts`:
- `getPresentations()` - Get all PPTs
- `getPresentationById(id: string)` - Get PPT details
- `exportPresentation(id: string, format: 'pptx' | 'pdf')` - Export PPT

### 3.3 Type Definitions

```typescript
// PPT list item
interface PresentationListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  slideCount: number;
  thumbnail?: string;
}

// PPT details
interface PresentationDetail {
  id: string;
  title: string;
  createdAt: string;
  slides: SlideContent[];
  template?: string;
  language?: string;
}

// Slide content
interface SlideContent {
  index: number;
  title?: string;
  content: object; // Presenton slide data structure
  thumbnail?: string;
}

// Export result
interface ExportResult {
  downloadUrl: string;
  format: 'pptx' | 'pdf';
  expiresAt?: string;
}
```

### 3.4 UI Component Requirements

- Use existing shadcn/ui components
- CometCard for PPT card display
- Responsive layout design
- Support dark mode
- Maintain consistency with existing page styles

## 4. Non-Functional Requirements

### 4.1 Performance Requirements
- PPT list load time < 3 seconds
- Preview page first screen load < 5 seconds
- Support lazy loading for large presentations

### 4.2 User Experience
- Clear loading state indicators
- Friendly error message prompts
- Empty state guides user to create PPT
- Operation feedback (toast notifications)

### 4.3 Security
- API calls require user authentication
- Ensure users can only access their own PPTs
- Download link security verification

## 5. Test Acceptance Criteria

1. User can view all their generated PPT list
2. PPT cards correctly display title, generation time, etc.
3. Clicking card navigates to preview page
4. Preview page correctly displays PPT content
5. Download button successfully downloads PPT file
6. Navigation bar correctly shows updated links
7. All pages support dark mode
8. Responsive layout works on mobile
9. Error handling and edge cases fully covered

## 6. Future Extensions (Optional)

- PPT delete functionality
- PPT rename functionality
- PPT sharing functionality
- Slide editing functionality
- PPT search and filtering
- Pagination optimization
