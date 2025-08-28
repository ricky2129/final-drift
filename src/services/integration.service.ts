import { ApiUrl } from "constant";
import { resolveUrlParams } from "helpers";
import {
  SecretResponse,
  AWSSignInRequest,
  CloudResponse,
  GremlinResponse,
  GremlinSignInRequest,
  RepositorySignInRequest,
  UpdateIntegrationRequest,
  DriftAssistSignInRequest,
  DriftAssistResponse,
} from "interfaces";
import { get, post, put } from "network/query";

/**
 * A collection of functions to interact with the integration endpoints.
 *
 * @returns An object with the following methods:
 *   - `getSecretKeysByProjectId`: Fetches a list of AWS secrets for a given project id.
 *   - `getSecretKeysByApplicationId`: Fetches a list of AWS secrets for a given application id.
 *   - `createAwsSecret`: Creates an AWS secret.
 *   - `createGithubSecret`: Creates a Github secret.
 *   - `updateIntegration`: Updates an existing integration.
 */
const useIntegrationService = () => {
  /**
   * Fetches a list of secrets for a given project id.
   *
   * @param id - The infrastructure id to fetch the AWS secrets for.
   * @param project_id - The project id to fetch the AWS secrets for.
   * @returns A promise that resolves to an array of SecretResponse objects.
   */
  const getSecretKeysByProjectId = async (
    id: number,
    project_id: string,
  ): Promise<Array<SecretResponse>> => {
    const res = await get(
      resolveUrlParams(ApiUrl.GET_SECRETS_PROJECTID, {
        infrastructure_id: id.toString(),
        project_id,
      }),
    );

    return res || "";
  };

  /**
   * Fetches a list of secrets for a given application id.
   *
   * @param id The id of the infrastructure
   * @param application_id The application id to fetch the AWS secrets for
   *
   * @returns A list of secrets
   */
  const getSecretKeysByApplicationId = async (
    id: number,
    application_id: string,
  ): Promise<Array<SecretResponse>> => {
    // Validate application_id before making the request
    if (!application_id || application_id === 'undefined' || application_id === 'null') {
      console.error("❌ Invalid application_id provided:", application_id);
      throw new Error("Invalid application ID. Please ensure you have selected a valid application.");
    }

    const url = resolveUrlParams(ApiUrl.GET_SECRETS_APPLICATIONID, {
      infrastructure_id: id.toString(),
      application_id,
    });
    
    console.log("🔍 DEBUG - URL Construction:");
    console.log("  ApiUrl.GET_SECRETS_APPLICATIONID:", ApiUrl.GET_SECRETS_APPLICATIONID);
    console.log("  infrastructure_id:", id.toString());
    console.log("  application_id:", application_id);
    console.log("  Final URL:", url);
    
    const res = await get(url);

    return res || "";
  };

  /**
   * Creates an AWS secret.
   * @param {AWSSignInRequest} obj
   * @returns {Promise<SecretResponse>}
   */
  const createAwsSecret = async (
    obj: AWSSignInRequest,
  ): Promise<SecretResponse> => {
    const res = await post(ApiUrl.CREATE_AWS_SECRET, obj);

    return res || "";
  };

  /**
   * Creates a Github secret.
   * @param {RepositorySignInRequest} obj
   * @returns {Promise<string>}
   */
  const createGithubSecret = async (
    obj: RepositorySignInRequest,
  ): Promise<string> => {
    const res = await post(`${ApiUrl.CREATE_GITHUB_SECRET}`, obj);

    return res || "";
  };

  /**
   * Creates a Gremlin secret.
   *
   * @param {GremlinSignInRequest} obj The object containing the secret name and token.
   *
   * @returns {Promise<string>} The response from the server.
   */
  const createGremlinSecret = async (
    obj: GremlinSignInRequest,
  ): Promise<string> => {
    const res = await post(ApiUrl.CREATE_GREMLIN_SECRET, obj);

    return res || "";
  };

  /**
   * Updates an integration.
   * @param {UpdateIntegrationRequest} obj The object to be updated.
   * @returns {Promise<string>} The response from the server.
   */
  const updateIntegration = async (
    obj: UpdateIntegrationRequest,
  ): Promise<SecretResponse> => {
    const res = await put(ApiUrl.UPDATE_INTEGRATION, obj);

    return res || "";
  };

  /**
   * Fetches the secret values for a given integration id.
   *
   * @param {string} integration_id - The id of the integration to fetch the secret values for.
   * @returns {Promise<SecretResponse | GremlinResponse | CloudResponse>} A promise that resolves to the secret values.
   */
  const getSecretValues = async (
    integration_id: string,
  ): Promise<SecretResponse | GremlinResponse | CloudResponse> => {
    const res = await get(
      resolveUrlParams(ApiUrl.GET_SECRET_VALUES, { integration_id }),
    );

    return res || "";
  };

  /**
   * Creates a Drift Assist secret.
   *
   * @param {DriftAssistSignInRequest} obj The object containing the drift assist credentials.
   * @returns {Promise<SecretResponse>} The response from the server.
   */
  const createDriftAssistSecret = async (
    obj: DriftAssistSignInRequest,
  ): Promise<SecretResponse> => {
    const res = await post(ApiUrl.CREATE_DRIFT_ASSIST_SECRET, obj);

    return res || "";
  };

  /**
   * Fetches the drift assist secret values for a given integration id.
   *
   * @param {string} integration_id - The id of the integration to fetch the drift assist secret values for.
   * @returns {Promise<DriftAssistResponse>} A promise that resolves to the drift assist secret values.
   */
  const getDriftAssistSecret = async (
    integration_id: string,
  ): Promise<DriftAssistResponse> => {
    const res = await get(
      resolveUrlParams(ApiUrl.GET_DRIFT_ASSIST_SECRET, { integration_id }),
    );

    return res || "";
  };

  /**
   * Fetches a list of drift assist secrets for a given project id.
   *
   * @param {string} project_id - The project id to fetch the drift assist secrets for.
   * @returns {Promise<Array<SecretResponse>>} A promise that resolves to an array of SecretResponse objects.
   */
  const getDriftAssistIntegrationsByProjectId = async (
    project_id: string,
  ): Promise<Array<SecretResponse>> => {
    const res = await get(
      resolveUrlParams(ApiUrl.GET_SECRETS_PROJECTID, {
        infrastructure_id: "4", // DriftAssist infrastructure ID
        project_id,
      }),
    );

    return res || "";
  };

  return {
    getSecretKeysByProjectId,
    getSecretKeysByApplicationId,
    createAwsSecret,
    createGithubSecret,
    updateIntegration,
    createGremlinSecret,
    getSecretValues,
    createDriftAssistSecret,
    getDriftAssistSecret,
    getDriftAssistIntegrationsByProjectId,
  };
};

export default useIntegrationService;
