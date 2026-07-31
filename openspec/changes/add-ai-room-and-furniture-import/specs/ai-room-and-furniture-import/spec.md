# AI Room and Furniture Import
## ADDED Requirements
### Requirement: Provider abstraction
AI features MUST use provider-neutral interfaces for room detection and furniture dimension estimation.
#### Requirement: Review and control
Suggestions MUST show confidence and proposed changes, require user review, and remain manually editable or rejectable before application.
#### Requirement: Secure configuration
API keys MUST be supplied through documented runtime configuration or secure local settings and MUST NOT be committed, logged, or embedded in client artifacts.
#### Requirement: Resilient fallback
Missing keys, provider errors, timeouts, privacy refusal, and low confidence MUST leave the existing editor usable via manual workflows.
#### Requirement: Explicit uploads
The system MUST submit only user-selected images and clearly communicate processing status and failure.
#### Scenario: Low confidence
- **Given** a low-confidence wall proposal, **when** reviewed, **then** it remains unapplied until accepted or corrected.
#### Scenario: Provider unavailable
- **Given** an unavailable provider, **when** import runs, **then** manual room/furniture creation remains available.
