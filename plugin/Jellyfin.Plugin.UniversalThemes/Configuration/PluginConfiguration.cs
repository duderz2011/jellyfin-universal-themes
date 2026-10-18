using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.UniversalThemes.Configuration;

/// <summary>Persistent preferences, independent of the library's physical storage.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    public string ThemeId { get; set; } = "cinema-dark";

    public string[] DisplayGenres { get; set; } =
    [
        "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
        "Drama", "Family", "Fantasy", "Horror", "Mystery", "Romance",
        "Science Fiction", "Thriller", "War", "Western"
    ];
}
