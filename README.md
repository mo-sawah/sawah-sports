# Sawah Sports Premium v1.0.0

Premium WordPress plugin for football statistics powered by Sportmonks API v3.
Optimized for Cyprus football leagues with professional Sofascore-inspired design.

## ✨ Features (STAGE 1 Complete)

### Core Widgets
- ✅ Live Matches (with auto-refresh)
- ✅ Enhanced Standings (with form)
- ✅ Fixtures & Results
- ✅ Match Center (detailed match view)
- ✅ Team Profile
- ✅ Player Profile

### Advanced Features
- ✅ xG (Expected Goals) Display
- ✅ Pre-match Odds
- ✅ Match Predictions
- ✅ Value Bets
- ✅ Head-to-Head Comparison
- ✅ Top Scorers
- ✅ Team Squad
- ✅ Injuries & Suspensions
- ✅ Referee Statistics
- ✅ TV Stations
- ✅ Events Timeline
- ✅ Pressure Index
- ✅ Live Standings

### Design
- 🎨 Premium black & white theme (Sofascore-inspired)
- 📱 Fully responsive
- ⚡ Smooth animations
- 🎯 Icon integration
- 💎 Professional UI/UX

### Cyprus Focus
- 🇨🇾 Cyprus First Division (ID: 570)
- 🇨🇾 Cyprus Cup (ID: 215)
- 🇨🇾 Cyprus Super Cup (ID: 7350)
- 🔧 Automatic Cyprus league prioritization
- 🌍 Multi-language support (Greek/English)

## 📦 Installation

1. Upload plugin to `/wp-content/plugins/sawah-sports/`
2. Activate through WordPress plugins menu
3. Install & activate Elementor (required)
4. Go to **Sawah Sports → Settings**
5. Add your Sportmonks API token
6. Configure cache settings

## 🚀 Usage

### Elementor Widgets
1. Open Elementor editor
2. Search for "Sawah" in widget panel
3. Find widgets under **"Sawah Sport"** category
4. Drag and drop desired widget
5. Configure widget settings

### Available Widgets
- **Live Matches** - Real-time scores with auto-refresh
- **Standings** - League table with form
- **Fixtures & Results** - Match schedule
- **Match Center** - Detailed match analysis
- **Team Profile** - Team statistics & squad
- **Player Profile** - Player stats & performance
- **Top Scorers** - League top scorers
- **H2H Comparison** - Head-to-head stats
- **xG Match** - Expected goals analysis
- **Odds Display** - Pre-match betting odds
- **Predictions** - AI match predictions

## ⚙️ API Endpoints

### Public REST API
Base: `https://yoursite.com/wp-json/sawah-sports/v1/`

- `GET /livescores` - Live match scores
- `GET /fixtures` - Match fixtures
- `GET /standings` - League standings
- `GET /fixture/{id}` - Match details
- `GET /xg/{fixture_id}` - Expected goals
- `GET /odds/{fixture_id}` - Match odds
- `GET /predictions/{fixture_id}` - Predictions
- `GET /team/{id}` - Team details
- `GET /player/{id}` - Player details
- `GET /topscorers/{season_id}` - Top scorers
- `GET /h2h/{team1}/{team2}` - Head-to-head
- `GET /sidelined/{team_id}` - Injuries/suspensions

### Rate Limiting
- Default: 60 requests per minute per IP
- Configurable in settings
- Applies to public API only
- Admin requests unlimited

## 🎨 Customization

### CSS Classes
All widgets use consistent CSS classes:
- `.ss-widget` - Main container
- `.ss-card` - Card wrapper
- `.ss-card-head` - Card header
- `.ss-body` - Card body
- `.ss-match-row` - Match item
- `.ss-team` - Team display
- `.ss-score` - Score display

### Color Scheme
Primary design uses:
- Black (#0f172a)
- White (#ffffff)
- Gray scale (#f8f9fa to #0f172a)
- Accent: Red for live (#ef4444)
- Accent: Green for wins (#22c55e)

## 🔧 Requirements

- WordPress 6.0+
- PHP 7.4+
- Elementor (latest version)
- Sportmonks API subscription
- Modern browser (Chrome, Firefox, Safari, Edge)

## 📊 Sportmonks Subscription

Features require different subscription plans:
- **Free**: Basic fixtures, standings
- **Standard**: + xG, advanced stats
- **Premium**: + Odds, predictions, value bets
- **Enterprise**: + All features, higher limits

Check: https://www.sportmonks.com/football-api/

## 🐛 Troubleshooting

### No Data Showing
1. Check API token in settings
2. Click "Test Connection"
3. Verify subscription includes requested data
4. Clear plugin cache
5. Check browser console for errors

### Slow Loading
1. Enable cache in settings
2. Increase TTL values
3. Reduce "include" parameters
4. Check server resources
5. Consider CDN for assets

### API Rate Limits
1. Enable caching
2. Increase TTL for less-changing data
3. Reduce auto-refresh frequency
4. Upgrade Sportmonks plan
5. Contact Sportmonks support

## 📝 Changelog

### 1.0.0 (2025-12-24)
- Initial premium release
- 11 Elementor widgets
- 12 REST API endpoints
- Cyprus league optimization
- Premium black/white design
- xG analytics
- Odds & predictions
- Complete match center
- Mobile responsive
- Icon integration
- Advanced caching
- Rate limiting
- Error handling
- Multi-language support

## 🎯 Roadmap

### Stage 2 (Planned)
- [ ] Calendar view
- [ ] Season statistics
- [ ] Advanced filters
- [ ] Match comparison tool
- [ ] Lineup builder
- [ ] Performance trends
- [ ] Custom dashboards

### Stage 3 (Future)
- [ ] Mobile app integration
- [ ] Push notifications
- [ ] Fantasy football tools
- [ ] Betting calculator
- [ ] Social sharing
- [ ] Widget builder
- [ ] API webhooks

## 👨‍💻 Developer Info

**Author**: Sawah Solutions  
**Website**: https://sawahsolutions.com  
**Plugin URI**: https://github.com/sawahsolutions/sawah-sports  
**License**: GPL v2 or later  
**Text Domain**: sawah-sports  

## 📞 Support

- Documentation: https://docs.sawahsolutions.com/sawah-sports
- Email: support@sawahsolutions.com
- GitHub Issues: https://github.com/sawahsolutions/sawah-sports/issues

## 🙏 Credits

- **Sportmonks** - API provider
- **Elementor** - Page builder
- **Sofascore** - Design inspiration
- **WordPress** - Platform

---

Made with ⚽ by Sawah Solutions for Cyprus Football Community
