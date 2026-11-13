@echo off
echo Jalankan file ini dengan klik kanan - Run as administrator.
echo Mengaktifkan WSL dan Virtual Machine Platform. Tidak menghapus data.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\activate-wsl.ps1"
if errorlevel 1 goto failed
echo Selesai. Jika Restart diperlukan bernilai True, simpan pekerjaan lalu restart Windows.
echo Docker Desktop sudah dipasang. Buka dari Start Menu setelah fitur WSL siap.
pause
exit /b 0
:failed
echo Aktivasi gagal. Baca pesan di atas; pastikan Run as administrator.
pause
exit /b 1
