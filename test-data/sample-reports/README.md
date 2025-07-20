# Sample Credit Report Test Data

This directory contains sample credit report files for testing Document AI processors.

## File Structure

- `sample-structured-credit-report.pdf` - Structured credit report with clear form fields (for Form Parser testing)
- `sample-scanned-credit-report.pdf` - Scanned credit report document (for OCR Processor testing)  
- `sample-complex-credit-report.pdf` - Complex multi-column credit report (for Layout Parser testing)
- `sample-mobile-photo.jpg` - Mobile phone photo of credit report (for OCR Processor testing)

## Adding Test Files

To add your own test files:

1. Place PDF or image files in this directory
2. Use descriptive names that indicate the document type
3. Ensure files are anonymized and contain no real personal information
4. Update the test configuration in `scripts/test-document-ai-processors.js` if needed

## File Requirements

- **PDF files**: Maximum 20MB, standard PDF format
- **Image files**: PNG, JPEG, TIFF, BMP formats supported, maximum 20MB
- **Content**: Should contain typical credit report elements (accounts, scores, personal info)
- **Privacy**: Must not contain real personal information

## Testing Process

The test files are used by:
- `scripts/test-document-ai-processors.js` - Automated processor testing
- `scripts/validate-document-ai-setup.js` - Setup validation
- Manual testing through the application

## Sample Data Sources

You can create test files from:
- Credit monitoring service sample reports (anonymized)
- Publicly available credit report templates
- Generated test documents with realistic but fake data
- Screenshots of demo credit reports (converted to PDF)

**Important**: Never use real credit reports or personal information in test files.