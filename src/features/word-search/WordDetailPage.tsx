import { Link, useParams } from "react-router-dom";
import { useUserState } from "../../app/providers/UserStateContext";
import { ArrowRightIcon } from "../../components/icons";
import { contentCatalog } from "../../content/loadContent";
import { WordActions } from "../word-actions/WordActions";
import { WordArticle } from "../word-feed/WordArticle";

export function WordDetailPage() {
  const { slug } = useParams();
  const userState = useUserState();
  const word = slug ? contentCatalog.wordsBySlug.get(slug) : undefined;

  if (!word) {
    return (
      <div className="screen">
        <div className="screen__scroll">
          <div className="screen__inner">
            <h1 className="display-heading settings-title">Sanaa ei löytynyt</h1>
            <p className="empty-note">Tämä osoite ei vastaa julkaistua sanaa.</p>
            <Link className="back-link back-link--after" to="/loyda">
              <ArrowRightIcon />
              Palaa hakuun
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const state = userState.data.words[word.id];

  return (
    <div className="screen">
      <div className="screen__scroll">
        <div className="screen__inner">
          <Link className="back-link" to="/loyda">
            <ArrowRightIcon />
            Takaisin hakuun
          </Link>
          <WordArticle key={word.id} word={word} categories={contentCatalog.categories} />
        </div>
      </div>
      <WordActions
        saved={Boolean(state?.saved)}
        known={Boolean(state?.known)}
        onToggleSaved={() => userState.toggleSaved(word.id)}
        onToggleKnown={() => userState.toggleKnown(word.id)}
      />
    </div>
  );
}
