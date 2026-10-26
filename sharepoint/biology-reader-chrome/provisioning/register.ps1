<#
    Register the Biology reader chrome on one site.

    Two modes, and the difference matters:

      -Scope Web           runs on every page in the site
      -Scope Web -File     runs on the one page named in -Page

    The component itself also refuses to render anywhere except -TargetPath,
    so the site-wide registration is safe: belt and braces. Use the site-wide
    form unless you have a reason not to, because a file registration stops
    matching if the page is ever renamed.

    Run from the site you deployed the app to.
#>

param(
    [string]$SiteUrl = 'https://hkis.sharepoint.com/sites/HSStudents',

    # Must match the id in BiologyReaderChromeApplicationCustomizer.manifest.json
    [string]$ComponentId = '5f88978a-36cd-4486-ae75-c04002a99315',

    [string]$Page = '/SitePages/Biology.aspx',
    [string]$ReaderUrl = 'https://dbbudd.github.io/biology/',
    [string]$HeaderSelector = '#spSiteHeader',

    # Register against the file instead of the whole site.
    [switch]$FileScope,

    # Read the decision back in the browser console.
    [switch]$Debug
)

$props = @{
    targetPath     = $Page
    readerUrl      = $ReaderUrl
    headerSelector = $HeaderSelector
    zIndex         = 800
    enabled        = $true
    debug          = [bool]$Debug
} | ConvertTo-Json -Compress

Connect-PnPOnline -Url $SiteUrl -Interactive

# Clear out anything left from a previous attempt, or you get two panels.
$existing = Get-PnPCustomAction -Scope Web | Where-Object { $_.ClientSideComponentId -eq $ComponentId }
foreach ($action in $existing) {
    Write-Host "Removing existing registration $($action.Id)" -ForegroundColor Yellow
    Remove-PnPCustomAction -Identity $action.Id -Scope Web -Force
}

$args = @{
    Title                        = 'Biology reader'
    Name                         = 'BiologyReaderChrome'
    Location                     = 'ClientSideExtension.ApplicationCustomizer'
    ClientSideComponentId        = $ComponentId
    ClientSideComponentProperties = $props
    Scope                        = 'Web'
}

if ($FileScope) {
    $args.RegistrationType = 'File'
    $args.RegistrationId   = $Page
}

Add-PnPCustomAction @args

Write-Host ''
Write-Host 'Registered:' -ForegroundColor Green
Get-PnPCustomAction -Scope Web |
    Where-Object { $_.ClientSideComponentId -eq $ComponentId } |
    Format-List Title, Location, RegistrationType, RegistrationId, ClientSideComponentProperties

Write-Host ''
Write-Host "Open $SiteUrl$Page with a hard refresh (Ctrl+Shift+R)." -ForegroundColor Cyan
Write-Host 'If nothing happens, add -Debug and watch the browser console for [BiologyReader].'
