Get-Process | Where-Object { $_.ProcessName -like '*chrome*' } | Select-Object Id, ProcessName | Format-Table -AutoSize
