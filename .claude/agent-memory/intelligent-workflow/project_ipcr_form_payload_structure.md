---
name: IpcrFormPayload Dual Purpose of accountable Field
description: The accountable field in IpcrFormRow serves different purposes in target submissions vs IPCR submissions
type: project
---

`IpcrFormRow.accountable` has two different meanings depending on the document type:

- **In ipcr_submissions**: Contains the "Accountable Office" template text (e.g., "Administrative officer and assigned records staff."). This is pre-filled by `IpcrFormTemplateService::baseTemplate()` and shown in the IPCR paper form.

- **In ipcr_targets**: Contains the employee's planned target/accomplishment for that criterion. The employee fills this in during the target submission window. It MUST start blank — use `IpcrFormTemplateService::targetDraft()` (not `draft()`) to generate a blank template for target forms.

**Target reference linkage**: When an employee opens the IPCR submission form, the matching `IpcrTarget` is passed as `currentTarget` to `IpcrPaperForm`. The component reads `currentTarget.form_payload.rows[].accountable` to show target reference callouts alongside each row's "Actual Accomplishment" input.

**Target-to-submission matching**: The target for an IPCR submission is found by parsing the IPCR period label to derive semester + year, then querying `ipcr_targets` with those values. The `IwrController::findEmployeeTargetForPeriod()` and `resolveSemesterAndYearFromLabel()` handle this.
