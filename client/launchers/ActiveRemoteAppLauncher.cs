using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Pipes;
using System.Net.Sockets;
using System.Drawing;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using AxMSTSCLib;
using MSTSCLib;

namespace RichRemoteApp.ActiveRemoteAppLauncher
{
    internal sealed class RdpOptions
    {
        public string Server = "";
        public int Port = 3389;
        public string Username = "";
        public string Password = "";
        public string RemoteProgram = "";
        public string RemoteProgramArgs = "";
        public string RemoteProgramWorkingDir = "";
        public bool RedirectDrives;
        public bool DisableConnectionSharing;
        public bool BrokerMode;
        public bool IsRemoteApp;
        public string BrokerPipeName = "";
        public string BrokerMutexName = "";

        public RemoteProgramRequest ToRemoteProgramRequest()
        {
            return new RemoteProgramRequest
            {
                RemoteProgram = RemoteProgram,
                RemoteProgramArgs = RemoteProgramArgs,
                RemoteProgramWorkingDir = RemoteProgramWorkingDir,
            };
        }
    }

    internal sealed class RemoteProgramRequest
    {
        public string RemoteProgram = "";
        public string RemoteProgramArgs = "";
        public string RemoteProgramWorkingDir = "";
    }

    internal static class Program
    {
        private const int StartupTimeoutSeconds = 60;
        private static readonly string LogPath = Path.Combine(Path.GetTempPath(), "RichActiveRemoteApp.log");

        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                Log("launcher start");
                RdpOptions options = ParseArguments(args);
                ValidateOptions(options);
                Log("target=" + options.Server + ":" + options.Port + ", user=" + options.Username + ", program=" + options.RemoteProgram);

                if (options.BrokerMode)
                {
                    ConfigureBrokerNames(options);
                    if (BrokerClient.TrySend(options.BrokerPipeName, options.ToRemoteProgramRequest(), 300))
                    {
                        Log("request forwarded to broker");
                        return 0;
                    }

                    using (Mutex brokerMutex = new Mutex(false, options.BrokerMutexName))
                    {
                        bool mutexAcquired = false;
                        try
                        {
                            DateTime deadline = DateTime.Now.AddSeconds(StartupTimeoutSeconds);
                            while (!mutexAcquired)
                            {
                                mutexAcquired = brokerMutex.WaitOne(0);
                                if (mutexAcquired)
                                {
                                    break;
                                }

                                if (BrokerClient.TrySend(options.BrokerPipeName, options.ToRemoteProgramRequest(), 500))
                                {
                                    Log("request forwarded to starting broker");
                                    return 0;
                                }

                                if (DateTime.Now >= deadline)
                                {
                                    throw new InvalidOperationException("已有 RemoteApp broker 正在启动，但无法发送启动请求");
                                }
                            }

                            RunLauncher(options);
                        }
                        finally
                        {
                            if (mutexAcquired)
                            {
                                brokerMutex.ReleaseMutex();
                            }
                        }
                    }
                    return 0;
                }

                RunLauncher(options);
                return 0;
            }
            catch (Exception ex)
            {
                Log("fatal: " + ex);
                return 1;
            }
        }

        private static void RunLauncher(RdpOptions options)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            using (LauncherForm form = new LauncherForm(options))
            {
                Application.Run(form);
            }
        }

        internal static void Log(string message)
        {
            try
            {
                File.AppendAllText(
                    LogPath,
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff ") + message + Environment.NewLine,
                    Encoding.UTF8);
            }
            catch
            {
            }
        }

        private static RdpOptions ParseArguments(string[] args)
        {
            string rdpFile = "";
            string credentialFile = "";
            bool brokerMode = false;
            for (int i = 0; i < args.Length; i++)
            {
                string arg = args[i];
                if (arg == "--rdp-file")
                {
                    rdpFile = ReadValue(args, ref i, arg);
                }
                else if (arg == "--credential-file")
                {
                    credentialFile = ReadValue(args, ref i, arg);
                }
                else if (arg == "--broker")
                {
                    brokerMode = true;
                }
                else
                {
                    throw new ArgumentException("不支持的参数: " + arg);
                }
            }

            if (!File.Exists(rdpFile))
            {
                throw new FileNotFoundException("RDP 文件不存在: " + rdpFile);
            }
            if (!File.Exists(credentialFile))
            {
                throw new FileNotFoundException("临时凭据文件不存在: " + credentialFile);
            }

            Dictionary<string, string> rdp = ParseRdpFile(rdpFile);
            Dictionary<string, string> credentials = ParseCredentialFile(credentialFile);
            RdpOptions options = new RdpOptions();
            string server = GetValue(rdp, "full address");
            if (string.IsNullOrWhiteSpace(server))
            {
                server = GetValue(rdp, "alternate full address");
            }
            ApplyServerAddress(options, server);
            options.Username = GetValue(credentials, "username");
            options.Password = GetValue(credentials, "password");
            options.RemoteProgram = GetValue(rdp, "remoteapplicationprogram");
            options.IsRemoteApp = GetValue(rdp, "remoteapplicationmode") == "1";
            options.RemoteProgramArgs = GetValue(rdp, "remoteapplicationcmdline");
            options.RemoteProgramWorkingDir = GetValue(rdp, "remoteapplicationworkingdir");
            options.RedirectDrives = GetValue(rdp, "redirectdrives") == "1";
            options.DisableConnectionSharing = GetValue(rdp, "disableconnectionsharing") == "1";
            options.BrokerMode = brokerMode;
            return options;
        }

        private static void ConfigureBrokerNames(RdpOptions options)
        {
            string brokerKey = (
                (options.Server ?? "").Trim().ToLowerInvariant() + "|" +
                options.Port.ToString() + "|" +
                (options.Username ?? "").Trim().ToLowerInvariant()
            );
            string hash = HashText(brokerKey);
            options.BrokerPipeName = "RichRemoteAppActiveRemoteApp-" + hash;
            options.BrokerMutexName = "Local\\RichRemoteAppActiveRemoteApp-" + hash;
            Log("broker=" + options.BrokerPipeName);
        }

        private static string HashText(string value)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(value));
                StringBuilder builder = new StringBuilder(bytes.Length * 2);
                foreach (byte item in bytes)
                {
                    builder.Append(item.ToString("x2"));
                }
                return builder.ToString();
            }
        }

        private static string ReadValue(string[] args, ref int index, string name)
        {
            if (index + 1 >= args.Length)
            {
                throw new ArgumentException("参数缺少值: " + name);
            }
            index++;
            return args[index];
        }

        private static Dictionary<string, string> ParseRdpFile(string path)
        {
            Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (string rawLine in File.ReadAllLines(path, Encoding.UTF8))
            {
                string line = rawLine.Trim();
                if (line.Length == 0)
                {
                    continue;
                }

                int first = line.IndexOf(':');
                if (first <= 0)
                {
                    continue;
                }
                int second = line.IndexOf(':', first + 1);
                if (second <= first)
                {
                    continue;
                }

                values[line.Substring(0, first).Trim()] = line.Substring(second + 1).Trim();
            }
            return values;
        }

        private static Dictionary<string, string> ParseCredentialFile(string path)
        {
            string content = File.ReadAllText(path, Encoding.UTF8);
            File.Delete(path);
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            Dictionary<string, object> json = serializer.Deserialize<Dictionary<string, object>>(content);
            Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (KeyValuePair<string, object> item in json)
            {
                values[item.Key] = item.Value == null ? "" : Convert.ToString(item.Value);
            }
            return values;
        }

        private static string GetValue(Dictionary<string, string> values, string key)
        {
            string value;
            return values.TryGetValue(key, out value) ? value : "";
        }

        private static void ApplyServerAddress(RdpOptions options, string address)
        {
            address = (address ?? "").Trim();
            if (address.StartsWith("[", StringComparison.Ordinal))
            {
                int endBracket = address.IndexOf(']');
                if (endBracket > 1)
                {
                    options.Server = address.Substring(1, endBracket - 1);
                    if (endBracket + 2 < address.Length && address[endBracket + 1] == ':')
                    {
                        int bracketPort;
                        if (int.TryParse(address.Substring(endBracket + 2), out bracketPort))
                        {
                            options.Port = bracketPort;
                        }
                    }
                    return;
                }
            }

            int firstColon = address.IndexOf(':');
            int lastColon = address.LastIndexOf(':');
            if (firstColon == lastColon && lastColon > 0 && lastColon < address.Length - 1)
            {
                int port;
                if (int.TryParse(address.Substring(lastColon + 1), out port))
                {
                    options.Server = address.Substring(0, lastColon);
                    options.Port = port;
                    return;
                }
            }

            options.Server = address;
        }

        private static void ValidateOptions(RdpOptions options)
        {
            if (string.IsNullOrWhiteSpace(options.Server))
            {
                throw new ArgumentException("RDP 文件缺少 full address");
            }
            if (string.IsNullOrWhiteSpace(options.Username))
            {
                throw new ArgumentException("缺少 RDP 用户名");
            }
            if (string.IsNullOrEmpty(options.Password))
            {
                throw new ArgumentException("缺少 RDP 密码");
            }
            if (options.IsRemoteApp && string.IsNullOrWhiteSpace(options.RemoteProgram))
            {
                throw new ArgumentException("RDP 文件缺少 remoteapplicationprogram");
            }
        }

        private static RemoteProgramRequest ParseRemoteProgramRequest(string payload)
        {
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            Dictionary<string, object> json = serializer.Deserialize<Dictionary<string, object>>(payload);
            RemoteProgramRequest request = new RemoteProgramRequest();
            object value;
            if (json.TryGetValue("remoteProgram", out value))
            {
                request.RemoteProgram = value == null ? "" : Convert.ToString(value);
            }
            if (json.TryGetValue("remoteProgramArgs", out value))
            {
                request.RemoteProgramArgs = value == null ? "" : Convert.ToString(value);
            }
            if (json.TryGetValue("remoteProgramWorkingDir", out value))
            {
                request.RemoteProgramWorkingDir = value == null ? "" : Convert.ToString(value);
            }
            ValidateRemoteProgramRequest(request);
            return request;
        }

        private static string SerializeRemoteProgramRequest(RemoteProgramRequest request)
        {
            ValidateRemoteProgramRequest(request);
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            Dictionary<string, string> json = new Dictionary<string, string>();
            json["remoteProgram"] = request.RemoteProgram ?? "";
            json["remoteProgramArgs"] = request.RemoteProgramArgs ?? "";
            json["remoteProgramWorkingDir"] = request.RemoteProgramWorkingDir ?? "";
            return serializer.Serialize(json);
        }

        private static void ValidateRemoteProgramRequest(RemoteProgramRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.RemoteProgram))
            {
                throw new ArgumentException("RemoteApp 启动请求缺少 remoteapplicationprogram");
            }
        }

        private sealed class BrokerClient
        {
            public static bool TrySend(string pipeName, RemoteProgramRequest request, int timeoutMilliseconds)
            {
                try
                {
                    string payload = SerializeRemoteProgramRequest(request);
                    using (NamedPipeClientStream pipe = new NamedPipeClientStream(".", pipeName, PipeDirection.Out))
                    {
                        pipe.Connect(timeoutMilliseconds);
                        byte[] payloadBytes = Encoding.UTF8.GetBytes(payload);
                        pipe.Write(payloadBytes, 0, payloadBytes.Length);
                        pipe.Flush();
                    }
                    return true;
                }
                catch (TimeoutException)
                {
                    return false;
                }
                catch (IOException)
                {
                    return false;
                }
                catch (UnauthorizedAccessException)
                {
                    return false;
                }
            }
        }

        private sealed class BrokerServer
        {
            private readonly string _pipeName;
            private readonly Action<RemoteProgramRequest> _handler;
            private Thread _thread;
            private volatile bool _stopped;

            public BrokerServer(string pipeName, Action<RemoteProgramRequest> handler)
            {
                _pipeName = pipeName;
                _handler = handler;
            }

            public void Start()
            {
                if (_thread != null)
                {
                    throw new InvalidOperationException("RemoteApp broker 已启动");
                }
                _thread = new Thread(Run);
                _thread.IsBackground = true;
                _thread.Name = "RichRemoteAppBrokerPipe";
                _thread.Start();
                Program.Log("broker server started");
            }

            public void Stop()
            {
                _stopped = true;
            }

            private void Run()
            {
                while (!_stopped)
                {
                    try
                    {
                        using (NamedPipeServerStream pipe = new NamedPipeServerStream(_pipeName, PipeDirection.In, 1))
                        {
                            pipe.WaitForConnection();
                            if (_stopped)
                            {
                                return;
                            }
                            using (StreamReader reader = new StreamReader(pipe, Encoding.UTF8))
                            {
                                string payload = reader.ReadToEnd();
                                RemoteProgramRequest request = ParseRemoteProgramRequest(payload);
                                _handler(request);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        if (!_stopped)
                        {
                            Program.Log("broker server error: " + ex.Message);
                            Thread.Sleep(100);
                        }
                    }
                }
            }
        }

        private sealed class LauncherForm : Form
        {
            private const int MaxDesktopWidth = 4096;
            private const int MaxDesktopHeight = 2048;
            private const int WsExToolWindow = 0x00000080;

            private readonly RdpOptions _options;
            private readonly AxMsRdpClient6NotSafeForScripting _client;
            private readonly System.Windows.Forms.Timer _startupTimer;
            private readonly Size _desktopSize;
            private readonly Queue<RemoteProgramRequest> _pendingProgramRequests = new Queue<RemoteProgramRequest>();
            private readonly BrokerServer _brokerServer;
            private bool _programStarted;
            private bool _loginComplete;

            public LauncherForm(RdpOptions options)
            {
                _options = options;
                _desktopSize = CalculateFullScreenSize();
                if (_options.BrokerMode)
                {
                    _brokerServer = new BrokerServer(_options.BrokerPipeName, QueueRemoteProgramRequest);
                }
                ShowInTaskbar = !_options.IsRemoteApp;
                FormBorderStyle = FormBorderStyle.None;
                StartPosition = FormStartPosition.Manual;
                Location = _options.IsRemoteApp ? CalculateHiddenLocation() : new Point(0, 0);
                ClientSize = _desktopSize;

                _client = new AxMsRdpClient6NotSafeForScripting();
                _client.Dock = DockStyle.Fill;
                Controls.Add(_client);

                _startupTimer = new System.Windows.Forms.Timer();
                _startupTimer.Interval = StartupTimeoutSeconds * 1000;
                _startupTimer.Tick += delegate
                {
                    Program.Log("startup timeout");
                    Close();
                };
            }

            protected override CreateParams CreateParams
            {
                get
                {
                    CreateParams createParams = base.CreateParams;
                    createParams.ExStyle |= WsExToolWindow;
                    return createParams;
                }
            }

            protected override void OnLoad(EventArgs e)
            {
                base.OnLoad(e);
                _client.CreateControl();
                ConfigureClient();
                AttachEvents();
                if (_brokerServer != null)
                {
                    _brokerServer.Start();
                    QueueRemoteProgramRequest(_options.ToRemoteProgramRequest());
                }
                ProbeTcp();
                _startupTimer.Start();
                Program.Log("Connect()");
                _client.Connect();
            }

            private static Size CalculateFullScreenSize()
            {
                Rectangle bounds = Screen.PrimaryScreen.Bounds;
                int width = Math.Min(MaxDesktopWidth, Math.Max(bounds.Width, 1024));
                int height = Math.Min(MaxDesktopHeight, Math.Max(bounds.Height, 768));
                return new Size(width, height);
            }

            private static Point CalculateHiddenLocation()
            {
                Rectangle virtualScreen = SystemInformation.VirtualScreen;
                return new Point(virtualScreen.Right + 64, virtualScreen.Bottom + 64);
            }

            private void ConfigureClient()
            {
                Program.Log("ConfigureClient start");
                _client.Server = _options.Server;
                _client.UserName = _options.Username;
                _client.ColorDepth = 32;
                _client.FullScreen = false;
                _client.DesktopWidth = _desktopSize.Width;
                _client.DesktopHeight = _desktopSize.Height;
                _client.AdvancedSettings3.SmartSizing = false;

                _client.AdvancedSettings3.RDPPort = _options.Port;
                _client.AdvancedSettings5.AuthenticationLevel = 0;
                _client.AdvancedSettings6.RedirectClipboard = true;
                _client.AdvancedSettings2.RedirectDrives = _options.RedirectDrives;
                _client.AdvancedSettings7.EnableCredSspSupport = true;
                _client.AdvancedSettings3.EnableAutoReconnect = false;
                _client.AdvancedSettings3.MaxReconnectAttempts = 0;
                _client.AdvancedSettings3.ContainerHandledFullScreen = -1;

                if (_options.DisableConnectionSharing)
                {
                    Program.Log("SetRdpProperty(disableconnectionsharing=1)");
                    _client.MsRdpClientShell.SetRdpProperty("disableconnectionsharing", 1);
                }

                IMsRdpClientNonScriptable4 nonScriptable = _client.GetOcx() as IMsRdpClientNonScriptable4;
                if (nonScriptable == null)
                {
                    throw new InvalidOperationException("无法获取 IMsRdpClientNonScriptable4");
                }
                nonScriptable.ClearTextPassword = _options.Password;
                nonScriptable.EnableCredSspSupport = true;

                _client.RemoteProgram.RemoteProgramMode = _options.IsRemoteApp;
                Program.Log("configured");
            }

            private void AttachEvents()
            {
                _client.OnConnecting += delegate { Program.Log("event OnConnecting"); };
                _client.OnConnected += delegate { Program.Log("event OnConnected"); };
                _client.OnLoginComplete += delegate
                {
                    Program.Log("event OnLoginComplete");
                    _loginComplete = true;
                    if (!_options.IsRemoteApp)
                    {
                        _startupTimer.Stop();
                        Program.Log("desktop session ready");
                    }
                    else if (_options.BrokerMode)
                    {
                        StartPendingRemotePrograms();
                    }
                    else
                    {
                        StartInitialRemoteProgram();
                    }
                };
                _client.OnDisconnected += delegate(object sender, IMsTscAxEvents_OnDisconnectedEvent e)
                {
                    Program.Log("event OnDisconnected reason=" + e.discReason);
                    if (_loginComplete)
                    {
                        Close();
                    }
                    // The ActiveX control can emit a transient disconnect while the
                    // connection is still progressing. Let the startup timeout
                    // decide if it never reaches login completion.
                };
                _client.OnFatalError += delegate(object sender, IMsTscAxEvents_OnFatalErrorEvent e)
                {
                    Program.Log("event OnFatalError code=" + e.errorCode);
                    Close();
                };
                _client.OnWarning += delegate(object sender, IMsTscAxEvents_OnWarningEvent e)
                {
                    Program.Log("event OnWarning code=" + e.warningCode);
                };
                _client.OnLogonError += delegate(object sender, IMsTscAxEvents_OnLogonErrorEvent e)
                {
                    Program.Log("event OnLogonError code=" + e.lError);
                    // MSTSC may report transient logon errors (notably -2) before OnLoginComplete.
                    // Wait for a terminal disconnect/fatal error or the startup timeout.
                };
                _client.OnRemoteProgramResult += delegate(object sender, IMsTscAxEvents_OnRemoteProgramResultEvent e)
                {
                    Program.Log("event OnRemoteProgramResult program=" + e.bstrRemoteProgram + ", error=" + e.lError + ", executable=" + e.vbIsExecutable);
                };
                _client.OnRemoteProgramDisplayed += delegate(object sender, IMsTscAxEvents_OnRemoteProgramDisplayedEvent e)
                {
                    Program.Log("event OnRemoteProgramDisplayed displayed=" + e.vbDisplayed + ", info=" + e.uDisplayInformation);
                };
            }

            private void QueueRemoteProgramRequest(RemoteProgramRequest request)
            {
                if (InvokeRequired)
                {
                    BeginInvoke(new Action<RemoteProgramRequest>(QueueRemoteProgramRequest), request);
                    return;
                }

                _pendingProgramRequests.Enqueue(request);
                if (_loginComplete)
                {
                    StartPendingRemotePrograms();
                }
            }

            private void StartPendingRemotePrograms()
            {
                while (_pendingProgramRequests.Count > 0)
                {
                    StartRemoteProgram(_pendingProgramRequests.Dequeue());
                }
            }

            private void StartInitialRemoteProgram()
            {
                if (_programStarted)
                {
                    return;
                }
                _programStarted = true;
                _startupTimer.Stop();
                StartRemoteProgram(_options.ToRemoteProgramRequest());
            }

            private void StartRemoteProgram(RemoteProgramRequest request)
            {
                _startupTimer.Stop();
                Program.Log("ServerStartProgram(" + request.RemoteProgram + ")");
                _client.RemoteProgram.ServerStartProgram(
                    request.RemoteProgram,
                    "",
                    request.RemoteProgramWorkingDir,
                    false,
                    request.RemoteProgramArgs,
                    false);
            }

            private void ProbeTcp()
            {
                try
                {
                    using (TcpClient tcp = new TcpClient())
                    {
                        IAsyncResult result = tcp.BeginConnect(_options.Server, _options.Port, null, null);
                        if (!result.AsyncWaitHandle.WaitOne(TimeSpan.FromSeconds(3)))
                        {
                            Program.Log("tcp probe timeout");
                            return;
                        }
                        tcp.EndConnect(result);
                        Program.Log("tcp probe ok");
                    }
                }
                catch (Exception ex)
                {
                    Program.Log("tcp probe failed: " + ex.Message);
                }
            }

            protected override void OnFormClosed(FormClosedEventArgs e)
            {
                _startupTimer.Stop();
                if (_brokerServer != null)
                {
                    _brokerServer.Stop();
                }
                try
                {
                    if (_client.Connected != 0)
                    {
                        _client.Disconnect();
                    }
                }
                catch
                {
                }
                base.OnFormClosed(e);
            }
        }
    }
}
