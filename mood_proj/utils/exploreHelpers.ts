export const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const parseSongData = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song.cover && song.cover.includes("100x100bb")) {
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    }
    return song;
  } catch {
    return null;
  }
};

export const normalize = (str: string) => (str ? str.trim().toLowerCase() : "");

export const getCreatorFromPost = (item: any) => {
  let userObj = item.creator || item.postedBy || item.users || item.user;
  if (Array.isArray(userObj) && userObj.length > 0) userObj = userObj[0];

  if (userObj && typeof userObj === "object") {
    return {
      id: userObj.$id || userObj.accountId,
      username: userObj.username || "anon",
      name: userObj.name || "Usuario",
      avatar: userObj.avatar || userObj.pfp,
      isVerified: userObj.isVerified,
    };
  }
  return {
    id: "unknown",
    username: "anon",
    name: "Usuario",
    avatar: null,
    isVerified: false,
  };
};

export const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff =
    now.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};
