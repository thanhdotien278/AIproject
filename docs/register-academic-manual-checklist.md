# Register Academic Manual Checklist

Use this checklist for the register form when `academic` is enabled in conference registration fields.

- PGS. + TS. shows `PGS. TS.` in the Academic input and submits successfully.
- GS. + TS. shows `GS. TS.` in the Academic input and submits successfully.
- Selecting PGS. before TS., or TS. before PGS., still submits/stores `PGS. TS.`.
- Selecting GS. before TS., or TS. before GS., still submits/stores `GS. TS.`.
- GS. + PGS. shows `Không thể chọn đồng thời GS. và PGS.` and submit is blocked.
- Cử nhân + ThS., ThS. + TS., or Cử nhân + TS. shows `Chỉ được chọn một học vị: Cử nhân, ThS. hoặc TS.` and submit is blocked.
- TS. only submits/stores `TS.`.
- ThS. only submits/stores `ThS.`.
- Cử nhân only submits/stores `Cử nhân`.
- Khác only submits/stores `Khác`.
- Khác plus a standard option is blocked by backend validation if submitted directly.
- Thank-you page and confirmation email show the same normalized `academic` string saved in the participant record.
