using System;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Serialization;
using Jellyfin.Plugin.UniversalThemes.Configuration;

namespace Jellyfin.Plugin.UniversalThemes;

/// <summary>Holds server-side genre and theme configuration; does not modify library paths.</summary>
public sealed class Plugin : BasePlugin<PluginConfiguration>
{
    public static readonly Guid PluginId = new("2fb88a53-c9ef-4558-aad8-d3f6ab1d7491");

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "Universal Themes & Genres";

    public override Guid Id => PluginId;

    public override string Description => "Theme selection and genre definitions for compatible Jellyfin clients; does not change media directories.";
}
