package de.sb.messenger.rest;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.glassfish.jersey.jdkhttp.JdkHttpServerFactory;
import org.glassfish.jersey.moxy.json.MoxyJsonFeature;
import org.glassfish.jersey.moxy.xml.MoxyXmlFeature;
import org.glassfish.jersey.server.ResourceConfig;
import com.sun.net.httpserver.HttpServer;
import de.sb.toolbox.Copyright;
import de.sb.toolbox.net.HttpFileHandler;
import de.sb.toolbox.net.RestJpaLifecycleProvider;
import de.sb.toolbox.net.RestResponseCodeProvider;


/**
 * This class is used within a Java-SE VM to deploy REST services.
 */
@Copyright(year=2013, holders="Sascha Baumeister")
public class ApplicationContainer {

	/**
	 * Application entry point.
	 * @param args the runtime arguments (service port and resource directory, both optional)
	 * @throws IllegalArgumentException if the given port is not a number, or if the given directory
	 *         is not a directory
	 * @throws IOException if there is an I/O related problem
	 */
	static public void main (final String[] args) throws IllegalArgumentException, IOException {
		final int servicePort = args.length > 0 ? Integer.parseInt(args[0]) : 80;
		final Path resourceDirectory = Paths.get(args.length > 1 ? args[1] : "").toAbsolutePath();
		if (!Files.isDirectory(resourceDirectory)) throw new IllegalArgumentException();

		final URI serviceURI;
		try {
			serviceURI = new URI("http", null, InetAddress.getLocalHost().getCanonicalHostName(), servicePort, "/services", null, null);
		} catch (final URISyntaxException exception) {
			throw new AssertionError();
		}

		// Note that server-startup is only required in Java-SE, as any Java-EE engine must ship a built-in HTTP server
		// implementation and XML-based configuration. The Factory-Class used is Jersey-specific, while the HTTP server
		// type used is Oracle/OpenJDK-specific. Other HTTP server types more suitable for production environments are
		// available, such as Apache Tomcat, Grizzly, Simple, etc.
		final ResourceConfig configuration = new ResourceConfig()
			.packages(ApplicationContainer.class.getPackage().toString())
			.register(MoxyJsonFeature.class)	// edit "network.http.accept.default" in Firefox's "about:config"
			.register(MoxyXmlFeature.class)		// to make "application/json" preferable to "application/xml"
			.register(RestResponseCodeProvider.class)
			.register(new RestJpaLifecycleProvider("messenger"));

		final HttpServer container = JdkHttpServerFactory.createHttpServer(serviceURI, configuration);
		final HttpFileHandler internalFileHandler = HttpFileHandler.newInstance("/internal");
		final HttpFileHandler externalFileHandler = HttpFileHandler.newInstance("/external", resourceDirectory);
		container.createContext(internalFileHandler.getContextPath(), internalFileHandler);
		container.createContext(externalFileHandler.getContextPath(), externalFileHandler);

		try {
			System.out.format("HTTP container running on service address %s:%s, enter \"quit\" to stop.\n", serviceURI.getHost(), serviceURI.getPort());
			System.out.format("Service path \"%s\" is configured for REST service access.\n", serviceURI.getPath());
			System.out.format("Service path \"%s\" is configured for class loader access.\n", internalFileHandler.getContextPath());
			System.out.format("Service path \"%s\" is configured for file system access within \"%s\".\n", externalFileHandler.getContextPath(), resourceDirectory);
			final BufferedReader charSource = new BufferedReader(new InputStreamReader(System.in));
			while (!"quit".equals(charSource.readLine()));
		} finally {
			container.stop(0);
		}
	}
}