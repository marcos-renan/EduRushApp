export type ApiUser = {
  external_id: string;
  name: string;
  username: string;
  email: string;
  role: "user" | "admin" | string;
  profile_photo_url?: string | null;
};

export type ApiStudentProfile = {
  external_id: string;
  grade_year: number;
  level: number;
  total_xp: number;
  current_streak: number;
  energy: number;
  energy_regen_cap: number;
  energy_recovery_minutes: number;
  energy_next_recharge_at: string | null;
};

export type LoginResponse = {
  token_type: "Bearer";
  access_token: string;
  user: ApiUser;
  student_profile: ApiStudentProfile;
};

export type RegisterPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  grade_year?: number;
};

export type TrailLesson = {
  external_id: string;
  title: string;
  slug: string;
  position: number;
  objective: string;
  xp_reward: number;
  difficulty?: "basic" | "intermediate" | "advanced" | string;
  prerequisite_lesson_external_id: string | null;
  is_completed: boolean;
  is_locked: boolean;
};

export type TrailItem = {
  external_id: string;
  title: string;
  slug: string;
  description: string;
  grade_year?: number;
  subject: {
    external_id: string;
    name: string;
    slug: string;
  };
  lessons_count: number;
  completed_lessons_count: number;
  lessons: TrailLesson[];
};

export type TrailsResponse = {
  data: TrailItem[];
  meta: {
    total_trails: number;
  };
};

export type TrailDetailResponse = {
  data: TrailItem;
};

export type MissionItem = {
  external_id: string;
  mission_key: string;
  mission_type: "daily" | "weekly" | string;
  title: string;
  description: string;
  metric: string;
  target: number;
  progress: number;
  progress_percent: number;
  reward_xp: number;
  starts_on: string;
  ends_on: string;
  is_completed: boolean;
};

export type MissionsResponse = {
  data: MissionItem[];
  meta: {
    total_missions: number;
    completed_missions: number;
    daily_missions: MissionItem[];
    weekly_missions: MissionItem[];
  };
};

export type ReviewErrorItem = {
  question_external_id: string | null;
  question_prompt: string | null;
  lesson: {
    title: string | null;
    slug: string | null;
    trail_title: string | null;
    subject_name: string | null;
  };
  attempts: number;
  last_selected_option: number | null;
  last_correct_option: number;
  last_answered_at: string | null;
  resolved_at: string | null;
  is_resolved: boolean;
};

export type ReviewErrorsResponse = {
  data: {
    pending_errors: ReviewErrorItem[];
    resolved_errors: ReviewErrorItem[];
  };
  meta: {
    pending_count: number;
    resolved_count: number;
  };
};

export type LessonQuestion = {
  external_id: string;
  position: number;
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string;
  xp_reward: number;
};

export type LessonQuestionsResponse = {
  data: {
    lesson: {
      external_id: string;
      title: string;
      slug: string;
      objective: string;
      difficulty?: "basic" | "intermediate" | "advanced" | string;
      trail: {
        external_id: string;
        title: string;
        slug: string;
        grade_year?: number;
      };
    };
    questions: LessonQuestion[];
    student_profile: ApiStudentProfile;
  };
  meta: {
    total_questions: number;
  };
};

export type LessonAttemptPayload = {
  answers: Array<{
    question_external_id: string;
    selected_option: number;
  }>;
};

export type LessonAttemptResponse = {
  data: {
    lesson: {
      external_id: string;
      slug: string;
      title: string;
      difficulty?: "basic" | "intermediate" | "advanced" | string;
      trail_grade_year?: number;
    };
    quiz: {
      total_questions: number;
      answered_questions: number;
      correct_answers: number;
      score: number;
    };
    progress: {
      passed: boolean;
      already_completed: boolean;
      earned_xp: number;
      energy_delta: number;
    };
    student_profile: ApiStudentProfile;
    completed_missions: Array<{
      title: string;
      reward_xp: number;
      mission_type: string;
    }>;
    unlocked_badges: Array<{
      name: string;
      icon?: string;
      color_hex?: string;
    }>;
  };
};

export type ProfileResponse = {
  data: {
    user: ApiUser;
    student_profile: ApiStudentProfile | null;
  };
};

export type UpdateProfilePayload = {
  name: string;
  username: string;
  email: string;
  grade_year?: number;
  password?: string;
  password_confirmation?: string;
};

export type FriendMember = {
  user: {
    external_id: string;
    name: string;
    username: string;
    handle: string;
    profile_photo_url?: string | null;
  };
  stats: {
    grade_year: number;
    level: number;
    total_xp: number;
    current_streak: number;
  };
};

export type FriendsSearchResponse = {
  data: Array<
    FriendMember & {
      is_friend: boolean;
      request_status: "friends" | "sent" | "received" | "none" | string;
    }
  >;
  meta: {
    query: string;
    total_results: number;
  };
};

export type FriendRequestsResponse = {
  data: {
    incoming: Array<{
      external_id: string;
      created_at: string | null;
      member: FriendMember;
    }>;
    outgoing: Array<{
      external_id: string;
      created_at: string | null;
      member: FriendMember;
    }>;
  };
  meta: {
    incoming_total: number;
    outgoing_total: number;
  };
};

export type FriendsListResponse = {
  data: FriendMember[];
  meta: {
    total_friends: number;
  };
};

export type FriendsRankingResponse = {
  data: Array<
    FriendMember & {
      rank: number;
      is_me: boolean;
    }
  >;
  meta: {
    total_members: number;
    total_friends: number;
  };
};
