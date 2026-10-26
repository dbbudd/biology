# Remove the registration

Always do this before re-registering a new build. Two custom actions pointing
at the same component mean two panels, and the second one looks like a bug in
the component.

```powershell
Connect-PnPOnline -Url https://hkis.sharepoint.com/sites/HSStudents -Interactive

Get-PnPCustomAction -Scope Web |
    Where-Object { $_.ClientSideComponentId -eq '5f88978a-36cd-4486-ae75-c04002a99315' } |
    ForEach-Object { Remove-PnPCustomAction -Identity $_.Id -Scope Web -Force }
```

If that returns nothing and the page still shows a panel, the registration is
at **Site** scope instead:

```powershell
Get-PnPCustomAction -Scope Site
```
