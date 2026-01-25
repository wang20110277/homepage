# Play anime notification sound
# Uses System.Windows.Media.MediaPlayer with proper STA mode and wait

# Get the script directory
if ($PSScriptRoot) {
    $scriptDir = $PSScriptRoot
} else {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}

$logPath = Join-Path $scriptDir "sound-hook.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$timestamp] Sound hook triggered" | Add-Content $logPath

# Sounds directory is in parent folder (.claude/sounds)
$soundPath = Join-Path (Split-Path $scriptDir -Parent) "sounds\anime-notification.mp3"

if (Test-Path $soundPath) {
    $fullPath = (Resolve-Path $soundPath).Path

    try {
        # Load assembly and create player
        Add-Type -AssemblyName PresentationCore
        $player = New-Object System.Windows.Media.MediaPlayer
        $player.Volume = 1
        $player.Open([uri]$fullPath)

        "[$timestamp] Playing: $fullPath" | Add-Content $logPath

        # Play and wait for completion
        $player.Play()

        # Wait for audio to play (MP3 is about 1-2 seconds)
        Start-Sleep -Seconds 2

        $player.Close()

    } catch {
        "[$timestamp] Error: $_" | Add-Content $logPath

        # Fallback to console beep
        [console]::beep(523, 120)
        Start-Sleep -Milliseconds 60
        [console]::beep(659, 120)
        Start-Sleep -Milliseconds 60
        [console]::beep(784, 120)
        Start-Sleep -Milliseconds 80
        [console]::beep(1047, 200)
    }

} else {
    "[$timestamp] MP3 file not found, playing beep melody" | Add-Content $logPath

    # Fallback: Cute anime melody with beeps
    [console]::beep(523, 120)   # C5
    Start-Sleep -Milliseconds 60
    [console]::beep(659, 120)   # E5
    Start-Sleep -Milliseconds 60
    [console]::beep(784, 120)   # G5
    Start-Sleep -Milliseconds 80
    [console]::beep(1047, 200)  # C6
}
