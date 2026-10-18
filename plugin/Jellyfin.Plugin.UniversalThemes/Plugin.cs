using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Jellyfin.Plugin.UniversalThemes.Configuration;

namespace Jellyfin.Plugin.UniversalThemes;

/// <summary>Stores preferences and supplies the server dashboard configuration page.</summary>
public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    /// <summary>Stable plugin identifier.</summary>
    public static readonly Guid PluginId = new("2fb88a53-c9ef-4558-aad8-d3f6ab1d7491");

    /// <summary>Creates the plugin.</summary>
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer) => Instance = this;

    /// <summary>Current plugin instance.</summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public override string Name => "Universal Themes & Genres";

    /// <inheritdoc />
    public override Guid Id => PluginId;

    /// <inheritdoc />
    public override string Description => "Theme and genre preferences for compatible clients; does not change media directories.";

    /// <summary>Provides the configuration page to Jellyfin's dashboard.</summary>
    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "UniversalThemesConfig",
            EmbeddedResourcePath = GetType().Namespace + ".Configuration.configPage.html"
        };
    }
}
