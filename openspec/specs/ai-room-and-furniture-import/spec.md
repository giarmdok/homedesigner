# AI Room and Furniture Import

## Purpose

Offer optional, provider-neutral AI assistance while keeping review, correction, and manual editing under user control.

## Requirements

### Requirement: Provider abstraction
AI features MUST use provider-neutral interfaces for room detection and furniture dimension estimation.

#### Scenario: Use an inference provider
- **WHEN** a selected image is submitted for room or furniture inference
- **THEN** the request uses the corresponding provider-neutral port
- **AND** the result contains a typed proposal and confidence score

### Requirement: Review and control
Suggestions MUST show confidence and proposed changes, require user review, and remain manually editable or rejectable before application.

#### Scenario: Review a suggestion
- **WHEN** an inference result is returned
- **THEN** the proposed changes and confidence are shown before application
- **AND** the user can accept, reject, or manually correct the suggestion

### Requirement: Secure configuration
API keys MUST be supplied through documented runtime configuration or secure local settings and MUST NOT be committed, logged, or embedded in client artifacts.

#### Scenario: Configure a provider key
- **WHEN** a deployment supplies an AI credential at runtime
- **THEN** the provider can read it through documented runtime configuration
- **AND** the credential is redacted from messages and excluded from source and bundled artifacts

### Requirement: Resilient fallback
Missing keys, provider errors, timeouts, privacy refusal, and low confidence MUST leave the existing editor usable via manual workflows.

#### Scenario: Provider unavailable
- **WHEN** an AI provider is unavailable or returns an error
- **THEN** the manual room and furniture workflows remain available
- **AND** the current project is not replaced

### Requirement: Explicit uploads
The system MUST submit only user-selected images and clearly communicate processing status and failure.

#### Scenario: Submit an explicit image
- **WHEN** the user selects an image and starts import
- **THEN** only that image is submitted
- **AND** processing, success, low confidence, or failure status is communicated

#### Scenario: Low confidence
- **WHEN** a wall or furniture proposal has low confidence
- **THEN** it remains unapplied until the user accepts or corrects it
