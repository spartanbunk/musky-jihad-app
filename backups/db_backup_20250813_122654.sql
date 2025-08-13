--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Debian 15.13-1.pgdg120+1)
-- Dumped by pg_dump version 15.13 (Debian 15.13-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: fishing_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO fishing_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: fishing_user
--

CREATE TABLE public.ai_insights (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    target_species_id integer,
    target_location_lat numeric(10,8),
    target_location_lng numeric(11,8),
    generated_at timestamp without time zone NOT NULL,
    recommendation_text text NOT NULL,
    confidence_score integer,
    conditions_analyzed json,
    historical_patterns_used json,
    success_prediction numeric(5,2),
    best_times json,
    recommended_techniques json,
    location_suggestions json,
    species_specific_factors json,
    user_rating integer,
    user_feedback text,
    actual_result boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_insights_confidence_score_check CHECK (((confidence_score >= 0) AND (confidence_score <= 100))),
    CONSTRAINT ai_insights_user_rating_check CHECK (((user_rating >= 1) AND (user_rating <= 5)))
);


ALTER TABLE public.ai_insights OWNER TO fishing_user;

--
-- Name: daily_fishing_reports; Type: TABLE; Schema: public; Owner: fishing_user
--

CREATE TABLE public.daily_fishing_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    report_date date NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    source character varying(50) DEFAULT 'perplexity-ai'::character varying,
    location character varying(100) DEFAULT 'Lake St. Clair, MI'::character varying,
    cache_status character varying(20) DEFAULT 'fresh'::character varying,
    token_count integer DEFAULT 0,
    generation_duration_ms integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.daily_fishing_reports OWNER TO fishing_user;

--
-- Name: environmental_data; Type: TABLE; Schema: public; Owner: fishing_user
--

CREATE TABLE public.environmental_data (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_source character varying(100),
    wind_speed numeric(4,1),
    wind_direction character varying(3),
    air_temperature numeric(5,2),
    barometric_pressure numeric(6,2),
    cloud_cover integer,
    moon_phase character varying(50)
);


ALTER TABLE public.environmental_data OWNER TO fishing_user;

--
-- Name: fish_catches; Type: TABLE; Schema: public; Owner: fishing_user
--

CREATE TABLE public.fish_catches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    species_id integer NOT NULL,
    fish_length numeric(5,2) NOT NULL,
    fish_weight numeric(6,2) NOT NULL,
    catch_time timestamp without time zone NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    depth_feet integer,
    location_notes text,
    lure_type character varying(100),
    bait_used character varying(100),
    technique_used character varying(100),
    environmental_conditions json,
    photo_url character varying(500),
    species_specific_attributes json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.fish_catches OWNER TO fishing_user;

--
-- Name: fish_species; Type: TABLE; Schema: public; Owner: fishing_user
--

CREATE TABLE public.fish_species (
    id integer NOT NULL,
    species_name character varying(100) NOT NULL,
    scientific_name character varying(150),
    map_color character varying(7) DEFAULT '#3b82f6'::character varying,
    icon_emoji character varying(10) DEFAULT '🐟'::character varying
);


ALTER TABLE public.fish_species OWNER TO fishing_user;

--
-- Name: fish_species_id_seq; Type: SEQUENCE; Schema: public; Owner: fishing_user
--

CREATE SEQUENCE public.fish_species_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fish_species_id_seq OWNER TO fishing_user;

--
-- Name: fish_species_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fishing_user
--

ALTER SEQUENCE public.fish_species_id_seq OWNED BY public.fish_species.id;


--
-- Name: knowledge_patterns; Type: TABLE; Schema: public; Owner: fishing_user
--

CREATE TABLE public.knowledge_patterns (
    id integer NOT NULL,
    species_id integer NOT NULL,
    pattern_type character varying(50) NOT NULL,
    pattern_name character varying(100) NOT NULL,
    pattern_description text,
    trigger_conditions json,
    expected_behavior json,
    recommended_techniques json,
    confidence_level integer,
    source character varying(100),
    valid_months integer[],
    valid_times_of_day time without time zone[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT knowledge_patterns_confidence_level_check CHECK (((confidence_level >= 1) AND (confidence_level <= 10)))
);


ALTER TABLE public.knowledge_patterns OWNER TO fishing_user;

--
-- Name: knowledge_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: fishing_user
--

CREATE SEQUENCE public.knowledge_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.knowledge_patterns_id_seq OWNER TO fishing_user;

--
-- Name: knowledge_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fishing_user
--

ALTER SEQUENCE public.knowledge_patterns_id_seq OWNED BY public.knowledge_patterns.id;


--
-- Name: user_analytics; Type: TABLE; Schema: public; Owner: fishing_user
--

CREATE TABLE public.user_analytics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    event_data json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_analytics OWNER TO fishing_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: fishing_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    subscription_status character varying(50) DEFAULT 'trial'::character varying
);


ALTER TABLE public.users OWNER TO fishing_user;

--
-- Name: fish_species id; Type: DEFAULT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.fish_species ALTER COLUMN id SET DEFAULT nextval('public.fish_species_id_seq'::regclass);


--
-- Name: knowledge_patterns id; Type: DEFAULT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.knowledge_patterns ALTER COLUMN id SET DEFAULT nextval('public.knowledge_patterns_id_seq'::regclass);


--
-- Data for Name: ai_insights; Type: TABLE DATA; Schema: public; Owner: fishing_user
--

COPY public.ai_insights (id, user_id, target_species_id, target_location_lat, target_location_lng, generated_at, recommendation_text, confidence_score, conditions_analyzed, historical_patterns_used, success_prediction, best_times, recommended_techniques, location_suggestions, species_specific_factors, user_rating, user_feedback, actual_result, created_at) FROM stdin;
\.


--
-- Data for Name: daily_fishing_reports; Type: TABLE DATA; Schema: public; Owner: fishing_user
--

COPY public.daily_fishing_reports (id, report_date, title, content, generated_at, source, location, cache_status, token_count, generation_duration_ms, created_at, updated_at) FROM stdin;
bdda22ef-3792-497a-8835-227d8b99d7cc	2025-08-11	Daily Fishing Report - Monday, August 11, 2025	Lake St. Clair is fishing well with a late-summer mixed bite: smallmouth bass are active in deep current areas off the St. Clair River mouths, musky action is good near the Canadian side of the channels, and a scattered walleye and perch bite is developing on mid-lake structure; panfish remain best in canals and protected bays with live bait[3].\n\n- Smallmouth bass\n  - Locations: Mouth of the Middle Channel and North Channel current edges; also around Grassy Island[3].\n  - Depths: About 30 feet at the Middle Channel mouth; 16–17 feet near Grassy Island[3].\n  - Techniques/baits: Jerkbaits, swimbaits, and drop-shot rigs are producing; work baits along breaks and where channel current softens on the flats[3].\n  - Additional areas from recent reports: Middle of Anchor Bay, Big Muscamoot Bay, and Ford Cove in 5–7 feet when water is cleaner; darker patterns plus green/yellow have been effective in the shallows after wind events[1].\n\n- Walleye\n  - Locations: Deep water adjacent to the mouths of the Middle and North Channels and nearby basins; some fish also reported in front of Metropark earlier in the season on the U.S. side[3][1].\n  - Depths: “Deep water” near the channel mouths (focus on 25–35 feet where bait and current align)[3].\n  - Techniques/baits: Trolling crawler harnesses remains the go-to; expect bycatch of channel catfish and northern pike while harness-trolling the edges[3]. Run blades low and slow on bottom bouncers or in-line weights; adjust speed if water clarity varies from wind[3][1].\n\n- Musky\n  - Locations: Same Middle Channel region, with stronger action very close to the Canadian side; anglers with Ontario licenses have been crossing and doing well[3].\n  - Depths: Target the channel edges and adjacent flats with bait schools in 15–30 feet, sliding shallower during low light[3].\n  - Techniques/baits: Trolling large crankbaits and bucktails along current seams and breaks; figure-eight fish at boatside when casting. Late summer is a prime period on St. Clair’s shallow basin and channel transitions[3][2].\n\n- Yellow perch\n  - Locations: The Spark Plug (mid-lake range marker) has produced a few fish, but schools are roaming; keep moving to stay on them[3].\n  - Depths: Typical Spark Plug drifts are in the mid-teens to low-20s; adjust until you mark pods of perch[3].\n  - Techniques/baits: Perch rigs with minnows or worms; make short drifts and reset on marks given the scattered nature of the bite[3].\n\n- Crappie\n  - Locations: Canals near Selfridge and Ford Cove remain the most consistent for summer slabs[1].\n  - Depths: 5–7 feet in the bays; slightly deeper in shaded canal pockets[1].\n  - Techniques/baits: Live minnows under floats and small jigs; work shaded docks and weed edges. Stealth and precise presentations help in clear water[1].\n\n- Bluegill/sunfish\n  - Locations: Ford Cove and protected canals around Selfridge; similar protected waters continue to give up panfish on live bait[1].\n  - Techniques/baits: Worms and other live baits under small floats or tight-line on the edges of weeds and docks[1].\n\nCurrent conditions and notes\n- The most reliable bite today is around the St. Clair River channel mouths where smallmouth and musky are feeding in the deeper, cooler water and current; bass anglers are succeeding with jerkbaits, swimbaits, and drop-shots in about 30 feet at the Middle Channel mouth, and fair bass action continues off Grassy Island in 16–17 feet[3].\n- Walleye action is scattered but present in the same deep zones; harness trollers should be prepared to cover water and may encounter catfish and pike[3].\n- Perch at the Spark Plug are showing in small pods—be ready to move to stay on fish[3].\n- In the shallows of Anchor Bay/Big Muscamoot/Ford Cove (5–7 feet), bass and panfish turn on when wind allows clarity; darker baits plus green/yellow have been productive in those zones, and crappie/bluegill respond best to live bait in canals and protected coves[1].\n- Fly anglers are finding clear-water flats sight-fishing opportunities in summer; topwater and baitfish/crayfish patterns produce on bass and carp during stable weather windows[5].\n\nLicensing and border reminder\n- Musky anglers working near or across the international line must remain on the legal side or carry proper Canadian licensing when crossing to the productive Canadian edges of the channels[3].	2025-08-11 15:14:32.494827	perplexity-ai	Lake St. Clair, MI	fresh	1147	18070	2025-08-11 15:14:32.494827	2025-08-11 15:14:32.494827
4a2f6f6f-8748-43b9-864a-9d7031de96de	2025-08-12	Daily Fishing Report - Tuesday, August 12, 2025	Lake St. Clair is fishing well this week with a clear late‑summer pattern: smallmouth and musky activity is solid on the main-lake edges and channel mouths, while mixed‑bag walleye, plus panfish in canals and protected bays, are available if you work depth, bait color, and water clarity shifts carefully[5].\n\n- Smallmouth bass\n  - Best zones: The mouth of the Middle Channel in about **30 ft**, plus **Grassy Island** edges in **16–17 ft**; anglers also reporting fish on mid‑lake humps/rock and open‑water structure typical for July–August patterns[5][3].\n  - Presentations: **Jerkbaits, small swimbaits, and drop‑shots** are producing at the channel mouth; community reports show strong summer success on **drop shot**, **Ned rigs**, **small swimbaits**, and **tubes** over rock/humps when fish are suspended or roaming[5][3].\n  - Notes: Work bait higher in the column over 25–35 ft when you mark fish off bottom; slide to 14–18 ft grass/rock transitions around islands when wind pushes bait. Goby and perch‑style plastics remain consistent on drifts; darker natural colors excel with bright sun; add purple/chartreuse when the water dirties after wind[2][3].\n\n- Musky\n  - Best zones: **Mouth of the Middle Channel** and adjacent St. Clair River approaches; best action has been tight to the **Canadian side** or across the line for properly licensed anglers[5].\n  - Presentations: Classic St. Clair **trolling passes** along breaks with large cranks and rubber, or casting big jerkbaits on the edges where smallmouth and bait concentrate; time around current seams and the 18–30 ft contour near channel mouths has been productive[5].\n  - Notes: Expect bycatch pike; keep leaders heavy and mind traffic in the channel[5].\n\n- Walleye\n  - Best zones: **Deep water** adjacent to the **Middle and North channel mouths**; fish reported between **Metropark and Memorial Park** earlier in the season and continue to pop for trollers working the mud‑line edge[5][2].\n  - Presentations: **Crawler harnesses** remain the top producer; some fish on **crankbaits/body baits**. Hot colors recently: **purple, yellow, blue, white**; run the harness just off bottom and trace the mud‑to‑clear transition—“clear water is not your friend” for St. Clair walleye[2][5].\n  - Notes: Expect incidental **channel cats** and **northern pike** on harnesses; adjust leads to stay just above zebra‑mussel‑covered rock and keep speed 1.2–1.8 mph depending on chop[5][2].\n\n- Yellow perch\n  - Best zones: Scattered pods near traditional deep‑water waypoints; a few perch showed at the **Spark Plug** area with roaming schools requiring anglers to move until they mark fish[5].\n  - Presentations: **Minnows** on perch rigs; keep hooks small and chase marks rather than anchoring long. Mix in small plastics when nuisance gobies are thick[5].\n\n- Crappie\n  - Best zones: **Canals** and sheltered marinas—patterns echo spring/early summer intel from Selfridge canals and Ford Cove; target shaded docks and inside weedlines early and late[1][2].\n  - Presentations: **Live minnows** under fixed or slip floats; downsize to 1/32–1/16 oz hair or tube jigs to cover water along canal corners and mouth intersections[2][1].\n\n- Bluegill/Sunfish\n  - Best zones: **Canals near Selfridge** and protected bays with clean weeds; focus on docks, seawalls, and inside milfoil/coontail edges[2][1].\n  - Presentations: **Live bait** (worms, waxies) on small jigs or plain hooks; keep presentations tight to cover and fish faster when sun is high to trigger reaction bites[2][1].\n\n- Largemouth bass (bonus)\n  - Best zones: Canal networks and marinas on the U.S. side near **Selfridge**, where vegetation and shade lines concentrate fish[1].\n  - Presentations: Variety of soft plastics, swim jigs, and topwaters around docks and cuts; largemouth have been aggressive in these waters and will eat “nearly everything” when conditions set up[1].\n\nCurrent conditions and tactical notes\n- Late‑summer clarity on St. Clair can shift quickly with wind; when a mud line sets up off the channels, **work its edge** for walleye and smallmouth, and switch to brighter blades/baits as stain increases[2][5].\n- Mid‑day smallmouth often slide deeper off the break—use **dropshots** with goby/perch patterns on humps and rock piles; mornings/evenings support **jerkbait** and **swimbait** bites when bait is higher in 12–20 ft[5][3].\n- If perch are nomadic, keep moving and watch electronics; when crappie/bluegill slow in canals, downsize and fish shade pockets methodically[5][2][1].\n\nHot baits this week\n- Smallmouth: **Drop‑shot minnows** and goby imitators, **3–3.8" swimbaits**, **jerkbaits**, **tubes**, **Ned rigs** over rock/humps[5][3].\n- Musky: Large **cran	2025-08-12 04:01:25.741681	perplexity-ai	Lake St. Clair, MI	fresh	1235	25692	2025-08-12 04:01:25.741681	2025-08-12 04:01:25.741681
\.


--
-- Data for Name: environmental_data; Type: TABLE DATA; Schema: public; Owner: fishing_user
--

COPY public.environmental_data (id, latitude, longitude, recorded_at, data_source, wind_speed, wind_direction, air_temperature, barometric_pressure, cloud_cover, moon_phase) FROM stdin;
09d34247-19b6-4a55-8e21-8e2118f0c1c8	42.45830000	-82.71670000	2025-08-10 19:37:40.499	noaa-buoy	5.8	SSE	68.00	30.00	30	Waning Crescent
fa1f1a91-455a-4f76-93b7-fa4588da9877	42.45830000	-82.71670000	2025-08-10 19:37:45.186	noaa-buoy	5.8	SSE	68.00	30.00	30	Waning Crescent
6fb1aadb-0a8d-4a1f-99a3-1f451284d978	42.45830000	-82.71670000	2025-08-10 19:40:16.554	noaa-buoy	5.8	SSE	68.00	30.00	30	Waning Crescent
6515a29f-0308-442d-9f4a-ba4feed39703	42.45830000	-82.71670000	2025-08-10 19:40:57.326	noaa-buoy	5.8	SSE	68.00	30.00	30	Waning Crescent
33ad9158-6c2a-4a03-8b1e-4f3f69d942f1	42.45830000	-82.71670000	2025-08-10 19:40:57.466	noaa-buoy	5.8	SSE	68.00	30.00	30	Waning Crescent
dad80275-5923-4ead-bc87-2ec54c191e7b	42.45830000	-82.71670000	2025-08-10 19:45:47.367	noaa-buoy	5.8	SSE	68.00	30.00	30	Waning Crescent
0432d45e-1c71-4d1b-945b-9f07a936e8fc	42.45830000	-82.71670000	2025-08-10 19:45:51.326	noaa-buoy	5.8	SSE	68.00	30.00	30	Waning Crescent
\.


--
-- Data for Name: fish_catches; Type: TABLE DATA; Schema: public; Owner: fishing_user
--

COPY public.fish_catches (id, user_id, species_id, fish_length, fish_weight, catch_time, latitude, longitude, depth_feet, location_notes, lure_type, bait_used, technique_used, environmental_conditions, photo_url, species_specific_attributes, created_at, updated_at) FROM stdin;
4c09c52b-33f2-491a-89e7-643cd6de20a0	36dd13ef-fc7f-4ee1-abd1-d470025eee81	5	0.40	0.50	2025-08-11 21:04:48.268	42.41946700	-82.74330800	3	Caught at 42.419467, -82.743308	Crankbait	\N	\N	{}	\N	{}	2025-08-11 21:04:48.863487	2025-08-13 13:38:58.07477
437aa7ea-28a8-4a6f-bdf1-defe7dffe772	17a71efe-f1bf-4313-b137-f608c05f9113	1	30.00	8.00	2025-08-13 09:05:39.255	42.50000000	-82.70000000	10	\N	Bucktail	\N	\N	\N	\N	\N	2025-08-13 13:05:39.250127	2025-08-13 13:05:39.250127
1f69ecbe-7821-4ca2-bfbc-0ac9ffae3d63	6c2d0045-dbe8-447b-859d-6f15749b48ec	2	18.00	3.00	2025-08-13 09:05:45.154	42.40000000	-82.80000000	15	\N	Jig	\N	\N	\N	\N	\N	2025-08-13 13:05:45.13653	2025-08-13 13:05:45.13653
544c4864-b28e-453c-b258-925091b246a5	36dd13ef-fc7f-4ee1-abd1-d470025eee81	6	0.20	0.20	2025-08-13 13:10:35.067	42.49476400	-82.73546800	\N	Caught at 42.494764, -82.735468	Jig	\N	\N	{}	\N	{}	2025-08-13 13:10:35.191057	2025-08-13 13:38:58.07477
d6815748-09c0-4051-b5f3-e63df2589b64	36dd13ef-fc7f-4ee1-abd1-d470025eee81	4	0.10	0.10	2025-08-13 13:08:07.038	42.50590100	-82.80344600	1	Caught at 42.505901, -82.803446	Bucktail	\N	\N	{}	\N	{}	2025-08-13 13:08:07.378661	2025-08-13 13:38:58.07477
b8b1a0db-ff03-4d12-8685-26299783968a	36dd13ef-fc7f-4ee1-abd1-d470025eee81	2	0.20	0.20	2025-08-13 12:59:00.475	42.39628200	-83.24524800	3	Caught at 42.396282, -83.245248	Bucktail	\N	\N	{}	http://localhost:3011/uploads/catch-1755089940794-104988770.jpg	{}	2025-08-13 12:59:00.87897	2025-08-13 13:38:58.07477
e6f44042-5890-4f8d-874e-bb7912505ef5	36dd13ef-fc7f-4ee1-abd1-d470025eee81	1	0.10	0.10	2025-08-13 12:57:49.263	42.39628200	-83.24524800	1	Caught at 42.396282, -83.245248	Bucktail	\N	\N	{}	\N	{}	2025-08-13 12:57:49.5782	2025-08-13 13:38:58.07477
56e748fd-3058-4a5b-b08f-f4f044ae8ad9	36dd13ef-fc7f-4ee1-abd1-d470025eee81	1	0.10	0.10	2025-08-13 12:56:35.082	42.47167200	-82.75524200	1	Caught at 42.471672, -82.755242	Bucktail	\N	\N	{}	\N	{}	2025-08-13 12:56:35.189378	2025-08-13 13:38:58.07477
5a0fd747-adf6-4ae8-84e4-4fd958e73b20	36dd13ef-fc7f-4ee1-abd1-d470025eee81	5	0.30	0.30	2025-08-11 21:18:37.853	42.39628200	-83.24524800	3	Caught at 42.396282, -83.245248	Bucktail	\N	\N	{}	http://localhost:3011/uploads/catch-1754947117864-554901648.jpg	{}	2025-08-11 21:18:38.04232	2025-08-13 13:38:58.07477
e6df2731-701c-49ba-9ec4-820bc6ef406a	36dd13ef-fc7f-4ee1-abd1-d470025eee81	5	0.30	0.30	2025-08-11 21:08:21.091	42.51678500	-82.76459700	3	Caught at 42.516785, -82.764597	Bucktail	\N	\N	{}	http://localhost:3011/uploads/catch-1754946501407-522624204.jpg	{}	2025-08-11 21:08:21.43173	2025-08-13 13:38:58.07477
d247ddb9-5889-4e1a-99d3-7165e28024b6	36dd13ef-fc7f-4ee1-abd1-d470025eee81	6	0.10	0.20	2025-08-11 20:29:48.244	42.42197400	-82.74983100	2	Caught at 42.421974, -82.749831	Bucktail	\N	\N	{"windSpeed":9,"windDirection":"E","airTemperature":90,"barometricPressure":30,"waterTemp":74,"waterTempRange":3.5999999999999943,"warmestWaterTemp":78.8,"coldestWaterTemp":75.2,"waveHeight":1.5,"cloudCover":30,"humidity":65,"moonPhase":"Waning Gibbous","moonIllumination":94,"moonOptimal":false,"sunrise":"06:34","sunset":"20:39","moonrise":"21:33","moonset":"09:05","dataSource":"multi-source-validated","dataQuality":{"sourcesUsed":1,"validationLevel":"medium","lastUpdated":"2025-08-11T20:26:45.889Z"},"capturedAt":"2025-08-11T20:29:48.244Z"}	\N	{}	2025-08-11 20:29:48.588738	2025-08-13 13:38:58.07477
53884f51-f9c8-46fb-90e1-3247c065b8a1	36dd13ef-fc7f-4ee1-abd1-d470025eee81	6	0.30	0.40	2025-08-11 20:27:03.741	42.45312300	-82.81017000	3	Caught at 42.453123, -82.810170	Bucktail	\N	\N	{"windSpeed":9,"windDirection":"E","airTemperature":90,"barometricPressure":30,"waterTemp":74,"waterTempRange":3.5999999999999943,"warmestWaterTemp":78.8,"coldestWaterTemp":75.2,"waveHeight":1.5,"cloudCover":30,"humidity":65,"moonPhase":"Waning Gibbous","moonIllumination":94,"moonOptimal":false,"sunrise":"06:34","sunset":"20:39","moonrise":"21:33","moonset":"09:05","dataSource":"multi-source-validated","dataQuality":{"sourcesUsed":1,"validationLevel":"medium","lastUpdated":"2025-08-11T20:26:45.889Z"},"capturedAt":"2025-08-11T20:27:03.741Z"}	\N	{}	2025-08-11 20:27:03.768764	2025-08-13 13:38:58.07477
b1faf903-bfdb-4906-bf52-9d110406e2e3	36dd13ef-fc7f-4ee1-abd1-d470025eee81	6	0.60	0.60	2025-08-11 20:24:45.171	42.40687600	-82.74631200	\N	Caught at 42.406876, -82.746312	\N	\N	\N	{"windSpeed":9,"windDirection":"E","airTemperature":90,"barometricPressure":30,"waterTemp":74,"waterTempRange":3.5999999999999943,"warmestWaterTemp":78.8,"coldestWaterTemp":75.2,"waveHeight":1.5,"cloudCover":30,"humidity":65,"moonPhase":"Waning Gibbous","moonIllumination":94,"moonOptimal":false,"sunrise":"06:34","sunset":"20:39","moonrise":"21:33","moonset":"09:05","dataSource":"multi-source-validated","dataQuality":{"sourcesUsed":1,"validationLevel":"medium","lastUpdated":"2025-08-11T20:24:06.247Z"},"capturedAt":"2025-08-11T20:24:45.171Z"}	\N	{}	2025-08-11 20:24:45.215526	2025-08-13 13:38:58.07477
046b163d-33e3-4bc0-ab11-646875ac6728	36dd13ef-fc7f-4ee1-abd1-d470025eee81	5	0.20	0.20	2025-08-11 20:22:30.963	42.39420000	-82.65361400	2	Caught at 42.394200, -82.653614	\N	\N	\N	{"windSpeed":9,"windDirection":"E","airTemperature":90,"barometricPressure":30,"waterTemp":74,"waterTempRange":3.5999999999999943,"warmestWaterTemp":78.8,"coldestWaterTemp":75.2,"waveHeight":1.5,"cloudCover":30,"humidity":65,"moonPhase":"Waning Gibbous","moonIllumination":94,"moonOptimal":false,"sunrise":"06:34","sunset":"20:39","moonrise":"21:33","moonset":"09:05","dataSource":"multi-source-validated","dataQuality":{"sourcesUsed":1,"validationLevel":"medium","lastUpdated":"2025-08-11T20:20:53.378Z"},"capturedAt":"2025-08-11T20:22:30.963Z"}	\N	{}	2025-08-11 20:22:30.979281	2025-08-13 13:38:58.07477
5b98f321-a9a2-41f0-8843-4ec73b2149bd	36dd13ef-fc7f-4ee1-abd1-d470025eee81	6	0.30	0.30	2025-08-11 20:22:05.821	42.41220400	-82.75317800	5	Caught at 42.412204, -82.753178	Bucktail	\N	\N	{"windSpeed":9,"windDirection":"E","airTemperature":90,"barometricPressure":30,"waterTemp":74,"waterTempRange":3.5999999999999943,"warmestWaterTemp":78.8,"coldestWaterTemp":75.2,"waveHeight":1.5,"cloudCover":30,"humidity":65,"moonPhase":"Waning Gibbous","moonIllumination":94,"moonOptimal":false,"sunrise":"06:34","sunset":"20:39","moonrise":"21:33","moonset":"09:05","dataSource":"multi-source-validated","dataQuality":{"sourcesUsed":1,"validationLevel":"medium","lastUpdated":"2025-08-11T20:20:53.378Z"},"capturedAt":"2025-08-11T20:22:05.821Z"}	\N	{}	2025-08-11 20:22:06.4396	2025-08-13 13:38:58.07477
26b2017c-b319-42e4-a922-ba8fb363c221	36dd13ef-fc7f-4ee1-abd1-d470025eee81	1	42.00	15.50	2025-08-11 20:10:00	42.45830000	-82.71670000	10	Test location	Bucktail	\N	\N	{"airTemperature":75,"windSpeed":10,"windDirection":"SW","waterTemp":70}	\N	\N	2025-08-11 20:11:30.659858	2025-08-13 13:38:58.07477
10f9eddd-2ec9-4a87-8ddc-0680ca813405	36dd13ef-fc7f-4ee1-abd1-d470025eee81	3	0.10	0.10	2025-08-11 19:27:49.977	42.37088200	-82.76407000	1	Caught at 42.370882, -82.764070	Bucktail	\N	\N	{"windSpeed":11,"windDirection":"S","airTemperature":91,"barometricPressure":30,"waterTemp":74,"waterTempRange":3.5999999999999943,"warmestWaterTemp":78.8,"coldestWaterTemp":75.2,"waveHeight":1.5,"cloudCover":30,"humidity":65,"moonPhase":"Waning Gibbous","moonIllumination":94,"moonOptimal":false,"sunrise":"06:34","sunset":"20:39","moonrise":"21:33","moonset":"09:05","dataSource":"multi-source-validated","dataQuality":{"sourcesUsed":1,"validationLevel":"medium","lastUpdated":"2025-08-11T19:25:54.744Z"},"capturedAt":"2025-08-11T19:27:49.977Z"}	\N	{}	2025-08-11 19:27:50.309359	2025-08-13 13:38:58.07477
0fa765e4-8d4f-4575-90de-32de3b734a1d	36dd13ef-fc7f-4ee1-abd1-d470025eee81	2	0.70	0.30	2025-08-11 19:26:08.974	42.42458700	-82.65610100	3	Caught at 42.424587, -82.656101	Jerkbait	\N	\N	{"windSpeed":11,"windDirection":"S","airTemperature":91,"barometricPressure":30,"waterTemp":74,"waterTempRange":3.5999999999999943,"warmestWaterTemp":78.8,"coldestWaterTemp":75.2,"waveHeight":1.5,"cloudCover":30,"humidity":65,"moonPhase":"Waning Gibbous","moonIllumination":94,"moonOptimal":false,"sunrise":"06:34","sunset":"20:39","moonrise":"21:33","moonset":"09:05","dataSource":"multi-source-validated","dataQuality":{"sourcesUsed":1,"validationLevel":"medium","lastUpdated":"2025-08-11T19:25:54.744Z"},"capturedAt":"2025-08-11T19:26:08.974Z"}	\N	{}	2025-08-11 19:26:08.994628	2025-08-13 13:38:58.07477
c405b279-d112-4840-a3f0-393cd49c9439	36dd13ef-fc7f-4ee1-abd1-d470025eee81	1	22.00	22.00	2025-08-11 19:22:49.26	42.44134300	-82.69636300	22	Caught at 42.441343, -82.696363	Live Bait	\N	\N	{"windSpeed":11,"windDirection":"S","airTemperature":91,"barometricPressure":30,"waterTemp":74,"waterTempRange":3.5999999999999943,"warmestWaterTemp":78.8,"coldestWaterTemp":75.2,"waveHeight":1.5,"cloudCover":30,"humidity":65,"moonPhase":"Waning Gibbous","moonIllumination":94,"moonOptimal":false,"sunrise":"06:34","sunset":"20:39","moonrise":"21:33","moonset":"09:05","dataSource":"multi-source-validated","dataQuality":{"sourcesUsed":1,"validationLevel":"medium","lastUpdated":"2025-08-11T19:22:17.545Z"},"capturedAt":"2025-08-11T19:22:49.260Z"}	http://localhost:3011/uploads/catch-1754940169270-795272183.jpg	{}	2025-08-11 19:22:49.318898	2025-08-13 13:38:58.07477
5f2c761b-dbc4-4c39-a5c9-4d12da95edc7	36dd13ef-fc7f-4ee1-abd1-d470025eee81	1	12.00	12.00	2025-08-11 19:16:01.199	42.49533900	-82.85368900	2	Caught at 42.495339, -82.853689	Bucktail	\N	\N	{"windSpeed":11,"windDirection":"E","airTemperature":91,"barometricPressure":30,"waterTemp":74,"waterTempRange":3.5999999999999943,"warmestWaterTemp":78.8,"coldestWaterTemp":75.2,"waveHeight":1.5,"cloudCover":30,"humidity":65,"moonPhase":"Waning Gibbous","moonIllumination":94,"moonOptimal":false,"sunrise":"06:34","sunset":"20:39","moonrise":"21:33","moonset":"09:05","dataSource":"multi-source-validated","dataQuality":{"sourcesUsed":1,"validationLevel":"medium","lastUpdated":"2025-08-11T19:13:19.387Z"},"capturedAt":"2025-08-11T19:16:01.199Z"}	http://localhost:3011/uploads/catch-1754939761518-254650087.jpg	{}	2025-08-11 19:16:01.56082	2025-08-13 13:38:58.07477
ec975ba5-3aa4-4393-9836-6509e262708b	36dd13ef-fc7f-4ee1-abd1-d470025eee81	4	8.00	1.20	2025-08-11 16:05:33.341	42.45830000	-82.71670000	\N	\N	\N	\N	\N	{"airTemperature":75}	\N	\N	2025-08-11 20:05:33.368391	2025-08-13 13:38:58.07477
63966951-3688-4f43-b9da-dac5ad73513e	36dd13ef-fc7f-4ee1-abd1-d470025eee81	1	42.00	15.50	2025-08-11 15:59:10.623	42.45830000	-82.71670000	10	\N	Bucktail	\N	\N	{"airTemperature":75,"windSpeed":10,"windDirection":"SW"}	\N	\N	2025-08-11 19:59:10.618359	2025-08-13 13:38:58.07477
8adf52d4-03f3-439a-9579-7e12bc31e47f	36dd13ef-fc7f-4ee1-abd1-d470025eee81	4	0.30	0.30	2025-08-13 16:22:57.097	42.44985600	-82.78628000	3	Caught at 42.449856, -82.786280	Bucktail	\N	\N	{}	http://localhost:3011/uploads/catch-1755102177421-122047415.jpg	{}	2025-08-13 16:22:57.540494	2025-08-13 16:22:57.540494
\.


--
-- Data for Name: fish_species; Type: TABLE DATA; Schema: public; Owner: fishing_user
--

COPY public.fish_species (id, species_name, scientific_name, map_color, icon_emoji) FROM stdin;
4	bluegill	Lepomis macrochirus	#3b82f6	🐟
5	pike	\N	#dc2626	🐡
6	perch	\N	#eab308	🐟
7	salmon	\N	#ec4899	🍣
8	trout	\N	#06b6d4	🐟
1	musky	Esox masquinongy	#22c55e	🐟
2	walleye	Sander vitreus	#f97316	🐠
3	bass	Micropterus spp.	#f97316	🎣
\.


--
-- Data for Name: knowledge_patterns; Type: TABLE DATA; Schema: public; Owner: fishing_user
--

COPY public.knowledge_patterns (id, species_id, pattern_type, pattern_name, pattern_description, trigger_conditions, expected_behavior, recommended_techniques, confidence_level, source, valid_months, valid_times_of_day, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_analytics; Type: TABLE DATA; Schema: public; Owner: fishing_user
--

COPY public.user_analytics (id, user_id, event_type, event_data, created_at) FROM stdin;
9fa2f24c-3027-4bba-b3f7-9f71e618018b	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"musky","length":10,"weight":10,"location":{"latitude":42.499858,"longitude":-82.853686}}	2025-08-11 18:14:08.596796
7841bbd1-7c1f-4713-8654-2648c9ae1c04	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"bass","length":10,"weight":10,"location":{"latitude":42.451746,"longitude":-82.70537}}	2025-08-11 18:35:08.913478
f390738a-3ac5-4bf0-99d5-0cd9229642f5	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"musky","length":50,"weight":50,"location":{"latitude":42.404218,"longitude":-82.589413}}	2025-08-11 19:09:47.188139
49eeba4c-b8de-498c-9859-b529e3963794	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"musky","length":12,"weight":12,"location":{"latitude":42.495339,"longitude":-82.853689}}	2025-08-11 19:16:01.566896
4b41ef2e-ae4d-4a34-8ae0-50c25de084db	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"musky","length":22,"weight":22,"location":{"latitude":42.441343,"longitude":-82.696363}}	2025-08-11 19:22:49.325327
b26f0f6d-9062-4bb1-80c7-ef7e5f5d1f13	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"walleye","length":0.7,"weight":0.3,"location":{"latitude":42.424587,"longitude":-82.656101}}	2025-08-11 19:26:09.000406
9f77357c-65c8-453c-af0e-cca8a5b187df	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"bass","length":0.1,"weight":0.1,"location":{"latitude":42.370882,"longitude":-82.76407}}	2025-08-11 19:27:50.315159
6c632c4d-1241-4d93-80f9-e9045c7e5c27	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"musky","length":42,"weight":15.5,"location":{"latitude":42.4583,"longitude":-82.7167}}	2025-08-11 19:59:10.623607
1f1dff02-fa3e-414a-9c63-3bbc47eab015	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"bluegill","length":8,"weight":1.2,"location":{"latitude":42.4583,"longitude":-82.7167}}	2025-08-11 20:05:33.374742
ec43366d-5af2-421d-84cc-7cbec544572e	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"musky","length":42,"weight":15.5,"location":{"latitude":42.4583,"longitude":-82.7167}}	2025-08-11 20:11:30.665302
5b0ba94c-5a1f-4728-a120-5de2b9b9e98c	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"perch","length":0.3,"weight":0.3,"location":{"latitude":42.412204,"longitude":-82.753178}}	2025-08-11 20:22:06.445783
8700583d-83c0-4e93-a128-5070933ffa0a	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"pike","length":0.2,"weight":0.2,"location":{"latitude":42.3942,"longitude":-82.653614}}	2025-08-11 20:22:30.984726
7dddc952-a664-4bd2-8d54-b6de7d82c66b	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"perch","length":0.6,"weight":0.6,"location":{"latitude":42.406876,"longitude":-82.746312}}	2025-08-11 20:24:45.229899
ee13d909-fd01-49c3-998f-d817bc4f6796	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"perch","length":0.3,"weight":0.4,"location":{"latitude":42.453123,"longitude":-82.81017}}	2025-08-11 20:27:03.77885
275e9d48-99be-45c0-be19-077fd97ed5fc	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"perch","length":0.1,"weight":0.2,"location":{"latitude":42.421974,"longitude":-82.749831}}	2025-08-11 20:29:48.594774
a5ef6491-960d-425d-8564-41a1af0ae8ab	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"pike","length":0.4,"weight":0.5,"location":{"latitude":42.419467,"longitude":-82.743308}}	2025-08-11 21:04:48.871548
2978886f-42e4-4a94-ad69-069f57430bf9	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"pike","length":0.3,"weight":0.3,"location":{"latitude":42.516785,"longitude":-82.764597}}	2025-08-11 21:08:21.438042
5a497cf3-6f8f-44b6-b644-c16396e8afef	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"pike","length":0.3,"weight":0.3,"location":{"latitude":42.396282,"longitude":-83.245248}}	2025-08-11 21:18:38.048672
d533e968-e821-424a-ba81-f6c3053be3f7	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"pike","length":0.2,"weight":0.3,"location":{"latitude":42.422001,"longitude":-82.752754}}	2025-08-11 21:19:25.467044
ff6a1af0-e7f7-4203-b9f7-d27676e1d284	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"walleye","length":0.2,"weight":0.2,"location":{"latitude":42.396282,"longitude":-83.245248}}	2025-08-11 23:05:54.386405
9a0caef7-6343-4b21-9d51-8d560d7f2e07	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"musky","length":0.1,"weight":0.1,"location":{"latitude":42.471672,"longitude":-82.755242}}	2025-08-13 12:56:35.206065
06ef3654-701f-4b57-a691-f50f6b6b1763	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"musky","length":0.1,"weight":0.1,"location":{"latitude":42.396282,"longitude":-83.245248}}	2025-08-13 12:57:49.591841
0e504351-5837-4c3b-b4d1-6203d4e837db	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"walleye","length":0.2,"weight":0.2,"location":{"latitude":42.396282,"longitude":-83.245248}}	2025-08-13 12:59:00.883916
add105f0-8c11-436a-9394-a26a0ce2e18c	17a71efe-f1bf-4313-b137-f608c05f9113	catch_logged	{"species":"musky","length":30,"weight":8,"location":{"latitude":42.5,"longitude":-82.7}}	2025-08-13 13:05:39.263971
31c215a3-1366-4599-990f-cd4cbb9541d0	6c2d0045-dbe8-447b-859d-6f15749b48ec	catch_logged	{"species":"walleye","length":18,"weight":3,"location":{"latitude":42.4,"longitude":-82.8}}	2025-08-13 13:05:45.140357
377ec62c-d568-4bcc-bf61-5a849e8fff08	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"bluegill","length":0.1,"weight":0.1,"location":{"latitude":42.505901,"longitude":-82.803446}}	2025-08-13 13:08:07.383631
c83fec3e-8b36-430f-9bfe-ec08fd490e74	e953e111-f6e2-49df-801c-7fbf5885ec6a	catch_logged	{"species":"perch","length":0.2,"weight":0.2,"location":{"latitude":42.494764,"longitude":-82.735468}}	2025-08-13 13:10:35.196797
3131ee4b-14de-4ba2-96da-697310adf60f	36dd13ef-fc7f-4ee1-abd1-d470025eee81	catch_logged	{"species":"bluegill","length":0.3,"weight":0.3,"location":{"latitude":42.449856,"longitude":-82.78628}}	2025-08-13 16:22:57.54922
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: fishing_user
--

COPY public.users (id, email, password_hash, created_at, subscription_status) FROM stdin;
e953e111-f6e2-49df-801c-7fbf5885ec6a	test@fishing.com	test_hash	2025-08-11 18:14:08.57023	trial
17a71efe-f1bf-4313-b137-f608c05f9113	user1@test.com	$2a$12$A/7ngXnonDq9ZxP5W9N/9.It5fG.w2/Gmcf7E2fATpcgDb7tsl1ri	2025-08-13 13:05:14.430153	trial
6c2d0045-dbe8-447b-859d-6f15749b48ec	user2@test.com	$2a$12$rRYBSyGkFHaqcU7t.CmoH.H9faG1GNLAvns3j1YejqVTvlpfoug6e	2025-08-13 13:05:18.759045	trial
36dd13ef-fc7f-4ee1-abd1-d470025eee81	spartanbunk@gmail.com	$2a$12$hkqhvfT9y95b9OOd57TtaOB5S6kLTZ8jeciVKeLDJhILsfV0q6Il6	2025-08-10 23:19:51.961223	active
\.


--
-- Name: fish_species_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fishing_user
--

SELECT pg_catalog.setval('public.fish_species_id_seq', 8, true);


--
-- Name: knowledge_patterns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fishing_user
--

SELECT pg_catalog.setval('public.knowledge_patterns_id_seq', 1, false);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: daily_fishing_reports daily_fishing_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.daily_fishing_reports
    ADD CONSTRAINT daily_fishing_reports_pkey PRIMARY KEY (id);


--
-- Name: daily_fishing_reports daily_fishing_reports_report_date_key; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.daily_fishing_reports
    ADD CONSTRAINT daily_fishing_reports_report_date_key UNIQUE (report_date);


--
-- Name: environmental_data environmental_data_pkey; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.environmental_data
    ADD CONSTRAINT environmental_data_pkey PRIMARY KEY (id);


--
-- Name: fish_catches fish_catches_pkey; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.fish_catches
    ADD CONSTRAINT fish_catches_pkey PRIMARY KEY (id);


--
-- Name: fish_species fish_species_pkey; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.fish_species
    ADD CONSTRAINT fish_species_pkey PRIMARY KEY (id);


--
-- Name: fish_species fish_species_species_name_key; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.fish_species
    ADD CONSTRAINT fish_species_species_name_key UNIQUE (species_name);


--
-- Name: knowledge_patterns knowledge_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.knowledge_patterns
    ADD CONSTRAINT knowledge_patterns_pkey PRIMARY KEY (id);


--
-- Name: user_analytics user_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.user_analytics
    ADD CONSTRAINT user_analytics_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_insights_user_species; Type: INDEX; Schema: public; Owner: fishing_user
--

CREATE INDEX idx_ai_insights_user_species ON public.ai_insights USING btree (user_id, target_species_id);


--
-- Name: idx_daily_reports_date; Type: INDEX; Schema: public; Owner: fishing_user
--

CREATE INDEX idx_daily_reports_date ON public.daily_fishing_reports USING btree (report_date);


--
-- Name: idx_daily_reports_generated_at; Type: INDEX; Schema: public; Owner: fishing_user
--

CREATE INDEX idx_daily_reports_generated_at ON public.daily_fishing_reports USING btree (generated_at);


--
-- Name: idx_fish_catches_catch_time_desc; Type: INDEX; Schema: public; Owner: fishing_user
--

CREATE INDEX idx_fish_catches_catch_time_desc ON public.fish_catches USING btree (catch_time DESC);


--
-- Name: idx_fish_catches_location; Type: INDEX; Schema: public; Owner: fishing_user
--

CREATE INDEX idx_fish_catches_location ON public.fish_catches USING btree (latitude, longitude);


--
-- Name: idx_fish_catches_time; Type: INDEX; Schema: public; Owner: fishing_user
--

CREATE INDEX idx_fish_catches_time ON public.fish_catches USING btree (catch_time);


--
-- Name: idx_fish_catches_user_catch_time; Type: INDEX; Schema: public; Owner: fishing_user
--

CREATE INDEX idx_fish_catches_user_catch_time ON public.fish_catches USING btree (user_id, catch_time DESC);


--
-- Name: idx_fish_catches_user_species; Type: INDEX; Schema: public; Owner: fishing_user
--

CREATE INDEX idx_fish_catches_user_species ON public.fish_catches USING btree (user_id, species_id);


--
-- Name: idx_knowledge_patterns_species; Type: INDEX; Schema: public; Owner: fishing_user
--

CREATE INDEX idx_knowledge_patterns_species ON public.knowledge_patterns USING btree (species_id, pattern_type);


--
-- Name: fish_catches update_fish_catches_updated_at; Type: TRIGGER; Schema: public; Owner: fishing_user
--

CREATE TRIGGER update_fish_catches_updated_at BEFORE UPDATE ON public.fish_catches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_insights ai_insights_target_species_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_target_species_id_fkey FOREIGN KEY (target_species_id) REFERENCES public.fish_species(id);


--
-- Name: ai_insights ai_insights_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: fish_catches fish_catches_species_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.fish_catches
    ADD CONSTRAINT fish_catches_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.fish_species(id);


--
-- Name: fish_catches fish_catches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.fish_catches
    ADD CONSTRAINT fish_catches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: knowledge_patterns knowledge_patterns_species_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.knowledge_patterns
    ADD CONSTRAINT knowledge_patterns_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.fish_species(id);


--
-- Name: user_analytics user_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fishing_user
--

ALTER TABLE ONLY public.user_analytics
    ADD CONSTRAINT user_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

