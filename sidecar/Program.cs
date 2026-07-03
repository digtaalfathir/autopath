// Manufactura Connect — UIA Sidecar (Tier 4 Desktop Automation)
//
// A tiny native automation engine driven by the Node robot over JSON-RPC on
// stdio (one JSON object per line). Uses FlaUI (UIA3) so it works with Win32,
// WinForms, WPF and UIA applications by AutomationId/Name/ControlType — robust,
// resolution-independent element targeting.
//
//   stdin  : { "id": 1, "cmd": "click", "params": { "selector": "name:OK" } }
//   stdout : { "id": 1, "ok": true,  "result": { ... } }
//            { "id": 1, "ok": false, "error": "..." }
//   stderr : human-readable diagnostics (never parsed by Node)

using System.Text.Json;
using System.Text.Json.Nodes;
using FlaUI.Core;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Conditions;
using FlaUI.Core.Definitions;
using FlaUI.Core.Input;
using FlaUI.UIA3;

namespace Manufactura.Sidecar;

internal static class Program
{
    private static readonly UIA3Automation Automation = new();
    private static Application _app;        // launched/attached application
    private static Window _window;          // current main window scope

    private static int Main()
    {
        var outWriter = Console.Out;
        Console.Error.WriteLine("[sidecar] Manufactura UIA sidecar ready (FlaUI UIA3).");

        string line;
        while ((line = Console.In.ReadLine()) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            JsonNode req = null;
            object id = null;
            try
            {
                req = JsonNode.Parse(line);
                id = req?["id"]?.GetValue<object>();
                var cmd = req?["cmd"]?.GetValue<string>() ?? "";
                var p = req?["params"] as JsonObject ?? new JsonObject();
                var result = Dispatch(cmd, p);
                Respond(outWriter, id, true, result, null);
            }
            catch (Exception ex)
            {
                Respond(outWriter, id, false, null, ex.Message);
            }
        }
        return 0;
    }

    private static void Respond(TextWriter w, object id, bool ok, object result, string error)
    {
        var obj = new JsonObject
        {
            ["id"] = id == null ? null : JsonValue.Create(id),
            ["ok"] = ok,
        };
        if (ok) obj["result"] = result == null ? null : JsonSerializer.SerializeToNode(result);
        else obj["error"] = error;
        w.WriteLine(obj.ToJsonString());
        w.Flush();
    }

    // ── Command dispatch ─────────────────────────────────────────────
    private static object Dispatch(string cmd, JsonObject p)
    {
        string S(string k) => p[k]?.GetValue<string>() ?? "";
        int I(string k, int d) => p[k] != null && int.TryParse(p[k].ToString(), out var v) ? v : d;
        bool B(string k) => p[k] != null && bool.TryParse(p[k].ToString(), out var v) && v;

        switch (cmd)
        {
            case "health":
                return new { ok = true, engine = "flaui-uia3" };

            case "launch":
            {
                var path = S("path");
                var args = S("args");
                _app = string.IsNullOrEmpty(args) ? Application.Launch(path) : Application.Launch(path, args);
                _window = _app.GetMainWindow(Automation, TimeSpan.FromSeconds(I("timeoutMs", 15000) / 1000.0));
                return new { pid = _app.ProcessId, title = _window?.Title };
            }

            case "attach":
            {
                var byTitle = S("title");
                var byProc = S("process");
                if (!string.IsNullOrEmpty(byProc))
                    _app = Application.Attach(byProc.EndsWith(".exe") ? byProc[..^4] : byProc);
                else if (int.TryParse(S("pid"), out var pid))
                    _app = Application.Attach(pid);
                else
                    throw new Exception("attach needs 'process' or 'pid'.");
                _window = _app.GetMainWindow(Automation, TimeSpan.FromSeconds(10));
                if (!string.IsNullOrEmpty(byTitle))
                {
                    var w = _app.GetAllTopLevelWindows(Automation)
                        .FirstOrDefault(x => (x.Title ?? "").Contains(byTitle, StringComparison.OrdinalIgnoreCase));
                    if (w != null) _window = w;
                }
                return new { pid = _app.ProcessId, title = _window?.Title };
            }

            case "click":
            {
                var el = Resolve(S("selector"), I("timeoutMs", 10000));
                if (B("double")) el.DoubleClick();
                else if (S("button") == "right") el.RightClick();
                else el.Click();
                return new { clicked = true };
            }

            case "setText":
            {
                var el = Resolve(S("selector"), I("timeoutMs", 10000));
                var text = S("text");
                var vp = el.Patterns.Value.PatternOrDefault;
                if (vp != null) vp.SetValue(text);
                else { el.Focus(); Keyboard.Type(text); }
                return new { set = true };
            }

            case "getText":
            {
                var el = Resolve(S("selector"), I("timeoutMs", 10000));
                var vp = el.Patterns.Value.PatternOrDefault;
                var text = vp != null ? vp.Value.ValueOrDefault : (el.Name ?? "");
                return new { text };
            }

            case "getValue":
                goto case "getText";

            case "exists":
            {
                var el = TryResolve(S("selector"), I("timeoutMs", 3000));
                return new { exists = el != null };
            }

            case "waitFor":
            {
                var timeout = I("timeoutMs", 10000);
                var wantVisible = S("state") != "hidden";
                var deadline = DateTime.UtcNow.AddMilliseconds(timeout);
                while (DateTime.UtcNow < deadline)
                {
                    var el = TryResolve(S("selector"), 300);
                    var found = el != null && (!wantVisible || !el.IsOffscreen);
                    if (found == wantVisible) return new { ok = true };
                    Thread.Sleep(200);
                }
                throw new Exception($"waitFor timed out ({S("selector")}, state={S("state")}).");
            }

            case "close":
                try { _app?.Close(); } catch { /* ignore */ }
                _app = null; _window = null;
                return new { closed = true };

            default:
                throw new Exception($"Unknown command: {cmd}");
        }
    }

    // ── Selector resolution ──────────────────────────────────────────
    // Grammar: "automationId:X" | "name:X" | "controlType:Button" | "class:X"
    //          optional "#index" (1-based). Combine with " > " for descendants.
    private static AutomationElement Resolve(string selector, int timeoutMs)
    {
        var el = TryResolve(selector, timeoutMs);
        if (el == null) throw new Exception($"Element not found: {selector}");
        return el;
    }

    private static AutomationElement TryResolve(string selector, int timeoutMs)
    {
        if (_window == null) throw new Exception("No window. Call launch/attach first.");
        var parts = selector.Split(" > ", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        do
        {
            AutomationElement scope = _window;
            foreach (var part in parts)
            {
                scope = FindOne(scope, part);
                if (scope == null) break;
            }
            if (scope != null) return scope;
            Thread.Sleep(150);
        } while (DateTime.UtcNow < deadline);
        return null;
    }

    private static AutomationElement FindOne(AutomationElement scope, string cond)
    {
        var index = 0;
        var hashIx = cond.LastIndexOf('#');
        if (hashIx > 0 && int.TryParse(cond[(hashIx + 1)..], out var ix)) { index = ix - 1; cond = cond[..hashIx]; }

        var sepIx = cond.IndexOf(':');
        var kind = (sepIx > 0 ? cond[..sepIx] : "name").Trim().ToLowerInvariant();
        var val = (sepIx > 0 ? cond[(sepIx + 1)..] : cond).Trim();
        var cf = new ConditionFactory(Automation.PropertyLibrary);

        ConditionBase condition = kind switch
        {
            "automationid" or "aid" or "id" => cf.ByAutomationId(val),
            "class" or "classname"          => cf.ByClassName(val),
            "controltype" or "type"         => cf.ByControlType(Enum.Parse<ControlType>(val, true)),
            _                                => cf.ByName(val),
        };

        if (index > 0)
        {
            var all = scope.FindAllDescendants(condition);
            return index < all.Length ? all[index] : null;
        }
        return scope.FindFirstDescendant(condition);
    }
}
