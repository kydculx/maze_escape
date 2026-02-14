import { createClient } from '@supabase/supabase-js';

// Supabase 설정
const SUPABASE_URL = 'https://fjuoksspznlykpziybni.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rxqGXSfo9I3nXHQbvTIs9A__Fbq5d-W';

export class RankingManager {
    constructor() {
        this.supabase = null;
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: true }
            });
        }
        this.user = null;
    }

    /**
     * 익명 로그인 수행 (세션 복원 우선)
     */
    async signIn() {
        if (!this.supabase) return null;

        try {
            // 1. 기존 세션 확인
            const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();

            if (sessionData?.session?.user) {
                this.user = sessionData.session.user;
                console.log('[RankingManager] Session restored:', this.user.id);
            } else {
                // 2. 세션이 없으면 익명 로그인 (새 유저 생성 가능성 있음)
                console.log('[RankingManager] No active session, signing in anonymously...');
                const { data, error } = await this.supabase.auth.signInAnonymously();
                if (error) throw error;
                this.user = data.user;
                console.log('[RankingManager] Signed in anonymously:', this.user.id);
            }

            // 프로필 존재 확인 및 생성 (FK 제약 조건 방지)
            await this.ensureProfileExists();

            return this.user;
        } catch (error) {
            console.error('[RankingManager] Auth failed:', error);
            return null;
        }
    }

    /**
     * 프로필이 없으면 기본값으로 생성
     */
    async ensureProfileExists() {
        if (!this.supabase || !this.user) return false;

        try {
            const { data, error: fetchError } = await this.supabase
                .from('profiles')
                .select('id, nickname')
                .eq('id', this.user.id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (!data) {
                // 프로필이 없으면 생성 (닉네임 유니크 제약 조건을 위해 고유값 사용)
                const shortId = this.user.id.substring(0, 5);
                const { error: insertError } = await this.supabase
                    .from('profiles')
                    .insert({
                        id: this.user.id,
                        nickname: `Guest_${shortId}`,
                        updated_at: new Date().toISOString()
                    });
                if (insertError) throw insertError;
                console.log(`[RankingManager] Default profile created (Guest_${shortId}) for:`, this.user.id);
            } else {
                console.log(`[RankingManager] Profile exists for ${this.user.id}: ${data.nickname}`);
            }
            return true;
        } catch (error) {
            console.error('[RankingManager] Ensure profile failed:', error);
            return false;
        }
    }

    /**
     * 현재 유저의 프로필 정보 가져오기
     */
    async getProfile() {
        if (!this.supabase || !this.user) return null;
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.user.id)
                .maybeSingle();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[RankingManager] Get profile failed:', error);
            return null;
        }
    }

    /**
     * 닉네임 사용 가능 여부 확인
     */
    async checkNicknameAvailable(nickname) {
        if (!this.supabase) return false;

        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('nickname')
                .eq('nickname', nickname)
                .maybeSingle();

            if (error) throw error;
            return !data; // data가 없으면 사용 가능
        } catch (error) {
            console.error('[RankingManager] Check nickname failed:', error);
            return false;
        }
    }

    /**
     * 프로필(닉네임) 업데이트
     */
    async updateNickname(nickname) {
        if (!this.supabase || !this.user) return false;

        console.log(`[RankingManager] Updating nickname to "${nickname}" for user: ${this.user.id}`);

        try {
            // 명시적으로 update 수행
            const { data, error } = await this.supabase
                .from('profiles')
                .update({
                    nickname: nickname,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.user.id)
                .select();

            if (error) {
                console.error('[RankingManager] Update nickname failed:', error.message);
                return false;
            }

            if (data && data.length > 0) {
                console.log('[RankingManager] Nickname updated successfully:', data[0]);
                return true;
            } else {
                console.warn('[RankingManager] No profile found to update. Attempting upsert...');
                const { error: upsertError } = await this.supabase
                    .from('profiles')
                    .upsert({
                        id: this.user.id,
                        nickname: nickname,
                        updated_at: new Date().toISOString()
                    });

                if (upsertError) {
                    console.error('[RankingManager] Upsert nickname failed:', upsertError.message);
                    return false;
                }
                return true;
            }
        } catch (error) {
            console.error('[RankingManager] Unexpected error updating nickname:', error);
            return false;
        }
    }

    /**
     * 최고 점수 제출
     */
    async submitScore(stage, time, moves) {
        if (!this.supabase || !this.user) return false;

        try {
            // 프로필이 있는지 한 번 더 확인 (안전성 확보)
            await this.ensureProfileExists();

            // 기존 최고 점수 확인
            const { data: current, error: fetchError } = await this.supabase
                .from('rankings')
                .select('high_score, total_time, total_moves')
                .eq('user_id', this.user.id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            // 순위 산정 기준에 따라 업데이트 여부 결정:
            // 1. 스테이지가 더 높거나
            // 2. 스테이지가 같은데 시간이 더 짧거나
            // 3. 스테이지와 시간이 같은데 이동 횟수가 더 적을 때
            let shouldUpdate = false;
            if (!current) {
                shouldUpdate = true;
            } else if (stage > current.high_score) {
                shouldUpdate = true;
            } else if (stage === current.high_score) {
                if (time < current.total_time) {
                    shouldUpdate = true;
                } else if (time === current.total_time && moves < current.total_moves) {
                    shouldUpdate = true;
                }
            }

            if (shouldUpdate) {
                const { error } = await this.supabase
                    .from('rankings')
                    .upsert({
                        user_id: this.user.id,
                        high_score: stage,
                        total_time: time,
                        total_moves: moves,
                        updated_at: new Date().toISOString()
                    });
                if (error) {
                    console.error('[RankingManager] Score submission failed:', error.message, error.details);
                    return false;
                }
                console.log('[RankingManager] High score submitted:', { stage, time, moves });
            }
            return true;
        } catch (error) {
            console.error('[RankingManager] Unexpected error submitting score:', error);
            return false;
        }
    }

    /**
     * 상위 랭킹 데이터 가져오기 (닉네임, 시간, 이동 횟수 포함)
     */
    async getTopScores(limit = 10) {
        if (!this.supabase) return [];

        try {
            const { data, error } = await this.supabase
                .from('rankings')
                .select(`
                    high_score,
                    total_time,
                    total_moves,
                    profiles (nickname)
                `)
                .order('high_score', { ascending: false })
                .order('total_time', { ascending: true })
                .order('total_moves', { ascending: true })
                .limit(limit);

            if (error) throw error;

            return data.map(item => ({
                nickname: item.profiles?.nickname || 'Anonymous',
                score: item.high_score,
                time: item.total_time,
                moves: item.total_moves
            }));
        } catch (error) {
            console.error('[RankingManager] Fetch rankings failed:', error);
            return [];
        }
    }

    /**
     * 현재 유저의 랭킹 및 데이터 가져오기
     */
    async getUserRank() {
        if (!this.supabase || !this.user) return null;

        try {
            // 1. 유저의 현재 최고 기록 가져오기
            const { data: userScore, error: scoreError } = await this.supabase
                .from('rankings')
                .select('high_score, total_time, total_moves, profiles(nickname)')
                .eq('user_id', this.user.id)
                .maybeSingle();

            if (scoreError || !userScore) return null;

            // 2. 해당 기록보다 더 나은 기록을 가진 유저 수 카운트 (순위 산정)
            // SQL: count where (score > mine) OR (score = mine AND time < mytime) OR (score=mine AND time=mytime AND moves < mymoves)
            const { count, error: countError } = await this.supabase
                .from('rankings')
                .select('*', { count: 'exact', head: true })
                .or(`high_score.gt.${userScore.high_score},and(high_score.eq.${userScore.high_score},total_time.lt.${userScore.total_time}),and(high_score.eq.${userScore.high_score},total_time.eq.${userScore.total_time},total_moves.lt.${userScore.total_moves})`);

            if (countError) throw countError;

            return {
                rank: count + 1,
                nickname: userScore.profiles?.nickname || 'Anonymous',
                score: userScore.high_score,
                time: userScore.total_time,
                moves: userScore.total_moves
            };
        } catch (error) {
            console.error('[RankingManager] Get user rank failed:', error);
            return null;
        }
    }
}
