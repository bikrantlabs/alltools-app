# AllTools Expansion Plan

AllTools will expand by workflow family rather than by an unstructured list of utilities. The initial expansion prioritizes frequent offline file tasks, uses the existing plugin/job contract, and gives each tool a reusable page pattern.

## Release sequence

| Wave | Family | Tools | Why this order |
|---|---|---|---|
| 1 | PDF essentials | PDF to Text, PDF Merge, PDF Split, PDF Rotate, PDF Page Extract | Reuses the existing PDF runtime and serves the highest-priority workflow family |
| 2 | Image essentials | Convert, Resize, Compress, Crop, Image Metadata | High-frequency local operations with lightweight dependencies |
| 3 | Documents | DOCX to PDF, PDF to DOCX where reliable, Markdown to PDF, TXT/CSV format conversion | Extends the file-conversion promise without introducing cloud services |
| 4 | OCR and local ML | OCR, background removal, image upscaling | Optional heavyweight models; installed separately and capability-detected |
| 5 | Media and archives | Audio extraction, video conversion, archive inspection/extraction | Useful but more dependency-heavy and platform-sensitive |

## First expansion batch

The first implementation batch after PDF to Text should be PDF Merge, PDF Split, PDF Rotate, PDF Page Extract, Image Convert/Resize, and Markdown to PDF. Each tool should be a real offline operation with tests, a manifest, catalog registration, and a dedicated screen only where the interaction needs more than the generic form.

## Product rules

A tool is not added to the catalog until its backend passes protocol tests, its manifest validates, its local source path works on both supported platforms where applicable, and its UI states cover idle, selected files, running, completed, failed, and cancelled. Heavy dependencies and models remain optional and must never be pulled into the base installer.

The catalog distinguishes installed, available, updating, incompatible, and failed states. The desktop app groups tools by family and exposes search, recent tools, favorites, and a consistent file-in/progress/file-out pattern.
