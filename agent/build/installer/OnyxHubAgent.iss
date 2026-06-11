#ifndef SourceDir
#define SourceDir "..\.."
#endif

#ifndef OutputDir
#define OutputDir "..\dist"
#endif

#ifndef AppVersion
#define AppVersion "1.0.0"
#endif

[Setup]
AppId={{1D893163-260A-4ED3-9DD7-6862DCA2BE54}
AppName=OnyxHub Agent
AppVersion={#AppVersion}
AppPublisher=OnyxHub
DefaultDirName={autopf}\OnyxHub\Agent
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=OnyxHubAgentSetup-windows-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\onyxhub-agent.exe

[Files]
Source: "{#SourceDir}\build\tmp\onyxhub-agent.exe"; DestDir: "{app}"; Flags: ignoreversion

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
var
  ServerPage: TInputQueryWizardPage;

function InstallLogPath(): String;
begin
  Result := ExpandConstant('{app}\Logs\install.log');
end;

function EscapeLogValue(Value: String): String;
begin
  Result := Value;
  StringChangeEx(Result, '\', '\\', True);
  StringChangeEx(Result, '"', '\"', True);
  StringChangeEx(Result, #13, '\r', True);
  StringChangeEx(Result, #10, '\n', True);
end;

procedure WriteInstallLogFields(const Level, EventName, Fields, Message: String);
var
  Line: String;
  FieldPart: String;
begin
  ForceDirectories(ExpandConstant('{app}\Logs'));
  FieldPart := '';
  if Fields <> '' then
  begin
    FieldPart := ' ' + Fields;
  end;
  Line :=
    GetDateTimeString('yyyy-mm-dd hh:nn:ss.zzz', '-', ':') + ' ' +
    Level + ' component=installer event=' + EventName +
    FieldPart + ' msg="' + EscapeLogValue(Message) + '"';
  SaveStringToFile(InstallLogPath(), Line + #13#10, True);
end;

procedure WriteInstallLog(const Level, EventName, Message: String);
begin
  WriteInstallLogFields(Level, EventName, '', Message);
end;

function ExecHiddenAndCheck(const Filename, Parameters, StepName: string): Integer;
var
  ResultCode: Integer;
begin
  WriteInstallLog('INFO', 'step_start', StepName + ' 开始');
  if not FileExists(Filename) then
  begin
    WriteInstallLog('ERROR', 'step_failed', StepName + ' 失败：文件不存在 - ' + Filename);
    RaiseException(StepName + ' 失败：文件不存在 - ' + Filename);
  end;

  if not Exec(Filename, Parameters, ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    WriteInstallLog('ERROR', 'step_failed', StepName + ' 失败：无法启动进程 - ' + Filename + ' ' + Parameters);
    RaiseException(StepName + ' 失败：无法启动进程 - ' + Filename + ' ' + Parameters);
  end;

  if ResultCode <> 0 then
  begin
    WriteInstallLogFields('ERROR', 'step_failed', 'exitCode=' + IntToStr(ResultCode), StepName + ' 失败：退出码 = ' + IntToStr(ResultCode));
    RaiseException(StepName + ' 失败：退出码 = ' + IntToStr(ResultCode));
  end;

  WriteInstallLogFields('INFO', 'step_succeeded', 'exitCode=0', StepName + ' 成功');
  Result := ResultCode;
end;

procedure ExecHiddenIfExistsAndCheck(const Filename, Parameters, StepName: string);
var
  ResultCode: Integer;
begin
  if not FileExists(Filename) then
  begin
    WriteInstallLog('INFO', 'step_skipped', StepName + ' 跳过：文件不存在 - ' + Filename);
    Log('Skip missing command: ' + Filename + ' ' + Parameters);
    Exit;
  end;

  WriteInstallLog('INFO', 'step_start', StepName + ' 开始');
  if not Exec(Filename, Parameters, ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    WriteInstallLog('ERROR', 'step_failed', StepName + ' 失败：无法启动进程 - ' + Filename + ' ' + Parameters);
    RaiseException(StepName + ' 失败：无法启动进程 - ' + Filename + ' ' + Parameters);
  end;

  if ResultCode <> 0 then
  begin
    WriteInstallLogFields('ERROR', 'step_failed', 'exitCode=' + IntToStr(ResultCode), StepName + ' 失败：退出码 = ' + IntToStr(ResultCode));
    RaiseException(StepName + ' 失败：退出码 = ' + IntToStr(ResultCode));
  end;

  WriteInstallLogFields('INFO', 'step_succeeded', 'exitCode=0', StepName + ' 成功');
  Log('Command finished: ' + Filename + ' ' + Parameters + ', exitCode=' + IntToStr(ResultCode));
end;

function IsWindowsServiceInstalled(const ServiceName: string): Boolean;
var
  ResultCode: Integer;
  ScExe: string;
begin
  ScExe := ExpandConstant('{sys}\sc.exe');
  if not FileExists(ScExe) then
  begin
    RaiseException('检测服务状态失败：文件不存在 - ' + ScExe);
  end;

  if not Exec(ScExe, 'query "' + ServiceName + '"', ExpandConstant('{sys}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    RaiseException('检测服务状态失败：无法启动进程 - ' + ScExe);
  end;

  if ResultCode = 0 then
  begin
    Result := True;
    Exit;
  end;

  if ResultCode = 1060 then
  begin
    WriteInstallLog('INFO', 'service_cleanup_skipped', '旧服务不存在：' + ServiceName);
    Log('Skip existing service cleanup because service is not installed: ' + ServiceName);
    Result := False;
    Exit;
  end;

  if ResultCode = 1072 then
  begin
    WriteInstallLog('INFO', 'service_marked_delete', '服务已标记删除：' + ServiceName);
    Log('Service is marked for deletion: ' + ServiceName);
    Result := True;
    Exit;
  end;

  RaiseException('检测服务状态失败：退出码 = ' + IntToStr(ResultCode));
end;

procedure ExecScAndCheck(const Parameters, StepName: string);
var
  ResultCode: Integer;
  ScExe: string;
begin
  WriteInstallLog('INFO', 'sc_step_start', StepName + ' 开始');
  ScExe := ExpandConstant('{sys}\sc.exe');
  if not FileExists(ScExe) then
  begin
    RaiseException(StepName + ' 失败：文件不存在 - ' + ScExe);
  end;

  if not Exec(ScExe, Parameters, ExpandConstant('{sys}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    RaiseException(StepName + ' 失败：无法启动进程 - ' + ScExe + ' ' + Parameters);
  end;

  if ResultCode <> 0 then
  begin
    WriteInstallLogFields('ERROR', 'sc_step_failed', 'exitCode=' + IntToStr(ResultCode), StepName + ' 失败：退出码 = ' + IntToStr(ResultCode));
    RaiseException(StepName + ' 失败：退出码 = ' + IntToStr(ResultCode));
  end;
  WriteInstallLogFields('INFO', 'sc_step_succeeded', 'exitCode=0', StepName + ' 成功');
end;

procedure ExecScDeleteAndCheck(const ServiceName: string);
var
  ResultCode: Integer;
  ScExe: string;
begin
  WriteInstallLog('INFO', 'sc_delete_start', '卸载现有 OnyxHub Agent 服务开始');
  ScExe := ExpandConstant('{sys}\sc.exe');
  if not FileExists(ScExe) then
  begin
    RaiseException('卸载现有 OnyxHub Agent 服务失败：文件不存在 - ' + ScExe);
  end;

  if not Exec(ScExe, 'delete "' + ServiceName + '"', ExpandConstant('{sys}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    RaiseException('卸载现有 OnyxHub Agent 服务失败：无法启动进程 - ' + ScExe);
  end;

  if (ResultCode <> 0) and (ResultCode <> 1072) then
  begin
    WriteInstallLogFields('ERROR', 'sc_delete_failed', 'exitCode=' + IntToStr(ResultCode), '卸载现有 OnyxHub Agent 服务失败：退出码 = ' + IntToStr(ResultCode));
    RaiseException('卸载现有 OnyxHub Agent 服务失败：退出码 = ' + IntToStr(ResultCode));
  end;
  WriteInstallLogFields('INFO', 'sc_delete_succeeded', 'exitCode=' + IntToStr(ResultCode), '卸载现有 OnyxHub Agent 服务成功');
end;

procedure WaitUntilServiceDeleted(const ServiceName: string);
var
  I: Integer;
begin
  for I := 1 to 30 do
  begin
    if not IsWindowsServiceInstalled(ServiceName) then
    begin
      Exit;
    end;
    Sleep(500);
  end;

  RaiseException('旧服务未能及时删除：' + ServiceName);
end;

function HasInvalidChars(Value: String): Boolean;
var
  I: Integer;
begin
  Result := False;
  for I := 1 to Length(Value) do
  begin
    if (Ord(Value[I]) <= 32) or (Value[I] = '"') then
    begin
      Result := True;
      Exit;
    end;
  end;
end;

procedure InitializeWizard();
begin
  ServerPage := CreateInputQueryPage(
    wpSelectDir,
    '服务端地址',
    '配置 OnyxHub 服务端地址',
    '请输入 OnyxHub 服务端地址。未填写端口时自动使用 8080。'
  );
  ServerPage.Add('服务端地址:', False);
  ServerPage.Values[0] := '127.0.0.1';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  ServerAddress: String;
begin
  Result := True;
  if CurPageID = ServerPage.ID then
  begin
    ServerAddress := Trim(ServerPage.Values[0]);
    if ServerAddress = '' then
    begin
      MsgBox('服务端地址不能为空。', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    if HasInvalidChars(ServerAddress) then
    begin
      MsgBox('服务端地址不能包含空白字符或引号。', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    ServerPage.Values[0] := ServerAddress;
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  WriteInstallLog('INFO', 'install_prepare_start', '安装前检查开始');

  if not IsWindowsServiceInstalled('OnyxHubAgent') then
  begin
    WriteInstallLog('INFO', 'install_prepare_succeeded', '未检测到旧服务');
    Exit;
  end;

  try
    ExecScAndCheck('stop "OnyxHubAgent"', '停止现有 OnyxHub Agent 服务');
  except
    WriteInstallLog('WARN', 'service_stop_failed', '停止旧服务失败或旧服务已停止');
    Log('Existing OnyxHubAgent stop failed or service was already stopped.');
  end;

  try
    ExecScDeleteAndCheck('OnyxHubAgent');
    WaitUntilServiceDeleted('OnyxHubAgent');
    WriteInstallLog('INFO', 'install_prepare_succeeded', '旧服务清理完成');
  except
    WriteInstallLog('ERROR', 'install_prepare_failed', '停止或卸载旧服务失败');
    Result := '检测到现有安装，但停止或卸载旧服务失败。请先关闭 OnyxHubAgent 后重试。';
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep <> ssPostInstall then
  begin
    Exit;
  end;

  WriteInstallLogFields('INFO', 'install_start', 'installDir="' + EscapeLogValue(ExpandConstant('{app}')) + '"', 'OnyxHub Agent 安装开始');
  ExecHiddenAndCheck(ExpandConstant('{app}\onyxhub-agent.exe'), 'configure "' + ServerPage.Values[0] + '" 30', '配置 OnyxHub Agent');
  ExecHiddenAndCheck(ExpandConstant('{app}\onyxhub-agent.exe'), 'install', '安装 OnyxHub Agent 服务');
  ExecHiddenAndCheck(ExpandConstant('{app}\onyxhub-agent.exe'), 'start', '启动 OnyxHub Agent 服务');
  WriteInstallLog('INFO', 'install_succeeded', 'OnyxHub Agent 安装完成');
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep <> usUninstall then
  begin
    Exit;
  end;

  WriteInstallLog('INFO', 'uninstall_start', 'OnyxHub Agent 卸载开始');
  ExecHiddenIfExistsAndCheck(ExpandConstant('{app}\onyxhub-agent.exe'), 'stop', '停止 OnyxHub Agent 服务');
  ExecHiddenIfExistsAndCheck(ExpandConstant('{app}\onyxhub-agent.exe'), 'uninstall', '卸载 OnyxHub Agent 服务');
  ExecHiddenIfExistsAndCheck(ExpandConstant('{app}\onyxhub-agent.exe'), 'cleanup', '清理 OnyxHub Agent 安装策略');
  WriteInstallLog('INFO', 'uninstall_succeeded', 'OnyxHub Agent 卸载完成');
end;
