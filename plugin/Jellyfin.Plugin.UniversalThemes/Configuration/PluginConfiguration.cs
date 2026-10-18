using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.UniversalThemes.Configuration;

/// <summary>Preferences only; never changes physical media paths.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Selected web theme ID.</summary>
    public string ThemeId { get; set; } = "cinema-dark";

    /// <summary>Ordered display genre names.</summary>
    public string[] DisplayGenres { get; set; } =
    [
        "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
        "Drama", "Family", "Fantasy", "Horror", "Mystery", "Romance",
        "Science Fiction", "Thriller", "War", "Western"
    ];
}
